import { getAccessToken, invalidateAuthentication } from '@/auth/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')

const DEFAULT_ERROR_MESSAGES = Object.freeze({
  400: 'The request was not valid. Check the information and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested poll could not be found.',
  409: "This action conflicts with the poll's current state.",
  410: 'This poll is closed and no longer accepts votes.',
})

const TECHNICAL_ERROR_PATTERN =
  /exception|stack trace|sqlstate|npgsql|microsoft\.|system\.|inner exception|object reference|connection string|database error|trace[ -]?id|\bat\s+\S+\([^)]*:\d+/i

export class ApiError extends Error {
  constructor(status, message, validationErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.validationErrors = validationErrors
  }
}

function apiUrl(path) {
  if (!API_BASE_URL) {
    throw new ApiError(0, 'The service is not configured. Please contact the site administrator.')
  }

  return `${API_BASE_URL}/${String(path).replace(/^\/+/, '')}`
}

function isSafePublicMessage(value) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= 240 &&
    !value.includes('\n') &&
    !TECHNICAL_ERROR_PATTERN.test(value)
  )
}

function messageFromPayload(payload) {
  if (typeof payload === 'string') return payload.trim()
  if (!payload || typeof payload !== 'object') return ''

  return payload.message ?? payload.detail ?? payload.title ?? ''
}

function normalizeValidationErrors(payload) {
  const errors = payload && typeof payload === 'object' ? payload.errors : null
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return {}

  return Object.fromEntries(
    Object.entries(errors)
      .map(([field, messages]) => {
        const values = (Array.isArray(messages) ? messages : [messages])
          .filter(isSafePublicMessage)
          .map((message) => message.trim())

        return [field, values]
      })
      .filter(([, messages]) => messages.length > 0),
  )
}

async function parseResponse(response) {
  if (response.status === 204) return null

  const text = await response.text()
  if (!text) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('json')) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  return text
}

function normalizedApiError(response, payload) {
  const fallback =
    DEFAULT_ERROR_MESSAGES[response.status] ??
    'The request could not be completed. Please try again.'
  const serverMessage = messageFromPayload(payload)
  const message =
    response.status < 500 && isSafePublicMessage(serverMessage) ? serverMessage : fallback

  return new ApiError(response.status, message, normalizeValidationErrors(payload))
}

async function apiFetch(path, { method = 'GET', body, requiresAuth = false } = {}) {
  const headers = new Headers({ Accept: 'application/json' })

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (requiresAuth) {
    try {
      const token = await getAccessToken()
      headers.set('Authorization', `Bearer ${token}`)
    } catch {
      throw new ApiError(401, DEFAULT_ERROR_MESSAGES[401])
    }
  }

  let response

  try {
    const requestOptions = {
      method,
      headers,
    }

    if (body !== undefined) requestOptions.body = JSON.stringify(body)
    response = await fetch(apiUrl(path), requestOptions)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(0, 'The service could not be reached. Check your connection and try again.')
  }

  const payload = await parseResponse(response)
  if (!response.ok) {
    if (requiresAuth && response.status === 401) invalidateAuthentication()
    throw normalizedApiError(response, payload)
  }

  return payload
}

function valueFrom(dto, ...keys) {
  if (!dto || typeof dto !== 'object') return undefined

  for (const key of keys) {
    if (dto[key] !== undefined) return dto[key]
  }

  return undefined
}

function normalizeOption(option, fallbackIndex) {
  if (typeof option === 'string') {
    return { index: fallbackIndex, text: option }
  }

  return {
    index: Number(
      valueFrom(option, 'index', 'optionIndex', 'Index', 'OptionIndex') ?? fallbackIndex,
    ),
    text: String(valueFrom(option, 'text', 'optionText', 'label', 'Text', 'OptionText') ?? ''),
  }
}

function normalizePoll(dto, fallback = {}) {
  const source = dto && typeof dto === 'object' ? dto : {}
  const rawOptions = valueFrom(source, 'options', 'optionTexts', 'Options', 'OptionTexts')
  const fallbackOptions = valueFrom(fallback, 'options', 'optionTexts') ?? []
  const options = Array.isArray(rawOptions) ? rawOptions : fallbackOptions

  return {
    code: String(valueFrom(source, 'code', 'pollCode', 'Code', 'PollCode') ?? fallback.code ?? ''),
    question: String(valueFrom(source, 'question', 'Question') ?? fallback.question ?? ''),
    options: options.map(normalizeOption),
    isClosed: Boolean(
      valueFrom(source, 'isClosed', 'closed', 'IsClosed', 'Closed') ?? fallback.isClosed ?? false,
    ),
    createdAt: valueFrom(source, 'createdAt', 'CreatedAt') ?? fallback.createdAt ?? null,
    closedAt: valueFrom(source, 'closedAt', 'ClosedAt') ?? fallback.closedAt ?? null,
  }
}

function normalizeResultOption(option, fallbackIndex, totalVotes) {
  const normalized = normalizeOption(option, fallbackIndex)
  const votes = Number(valueFrom(option, 'votes', 'voteCount', 'count', 'Votes', 'VoteCount') ?? 0)
  const suppliedPercentage = valueFrom(option, 'percentage', 'Percentage')

  return {
    ...normalized,
    votes,
    percentage:
      suppliedPercentage === undefined
        ? totalVotes > 0
          ? (votes / totalVotes) * 100
          : 0
        : Number(suppliedPercentage),
  }
}

export function normalizePollResults(dto, code) {
  const source = dto && typeof dto === 'object' ? dto : {}
  const rawOptions = valueFrom(source, 'options', 'results', 'Options', 'Results') ?? []
  const suppliedTotal = valueFrom(
    source,
    'totalVotes',
    'responseCount',
    'TotalVotes',
    'ResponseCount',
  )
  const calculatedTotal = Array.isArray(rawOptions)
    ? rawOptions.reduce(
        (total, option) =>
          total +
          Number(valueFrom(option, 'votes', 'voteCount', 'count', 'Votes', 'VoteCount') ?? 0),
        0,
      )
    : 0
  const totalVotes = Number(suppliedTotal ?? calculatedTotal)

  return {
    code: String(valueFrom(source, 'code', 'pollCode', 'Code', 'PollCode') ?? code),
    question: String(valueFrom(source, 'question', 'Question') ?? ''),
    options: Array.isArray(rawOptions)
      ? rawOptions.map((option, index) => normalizeResultOption(option, index, totalVotes))
      : [],
    totalVotes,
    isClosed: Boolean(valueFrom(source, 'isClosed', 'closed', 'IsClosed', 'Closed') ?? false),
  }
}

function encodedPollCode(code) {
  const value = String(code ?? '').trim()
  if (!value) throw new ApiError(400, 'A poll code is required.')
  return encodeURIComponent(value)
}

function normalizeVoteReceipt(dto, code, optionIndex) {
  const source = dto && typeof dto === 'object' ? dto : {}

  return {
    accepted: Boolean(valueFrom(source, 'accepted', 'success', 'Accepted', 'Success') ?? true),
    code: String(valueFrom(source, 'code', 'pollCode', 'Code', 'PollCode') ?? code),
    optionIndex: Number(
      valueFrom(
        source,
        'optionIndex',
        'selectedOptionIndex',
        'OptionIndex',
        'SelectedOptionIndex',
      ) ?? optionIndex,
    ),
    submittedAt: valueFrom(source, 'submittedAt', 'createdAt', 'SubmittedAt', 'CreatedAt') ?? null,
  }
}

export async function createPoll(data) {
  const payload = {
    question: data?.question,
    options: data?.options,
  }
  const created = await apiFetch('/polls', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  })

  return normalizePoll(created, payload)
}

export async function getPoll(code) {
  const poll = await apiFetch(`/polls/${encodedPollCode(code)}`)
  return normalizePoll(poll, { code })
}

export async function submitVote(code, optionIndex, voterToken) {
  const normalizedCode = encodedPollCode(code)
  const response = await apiFetch(`/polls/${normalizedCode}/vote`, {
    method: 'POST',
    body: { optionIndex, voterToken },
  })

  return normalizeVoteReceipt(response, String(code ?? '').trim(), optionIndex)
}

export async function getPollResults(code) {
  const results = await apiFetch(`/polls/${encodedPollCode(code)}/results`)
  return normalizePollResults(results, String(code ?? '').trim())
}

export async function closePoll(code) {
  const normalizedCode = encodedPollCode(code)
  const closed = await apiFetch(`/polls/${normalizedCode}/close`, {
    method: 'PATCH',
    requiresAuth: true,
  })

  return normalizePoll(closed, { code: String(code).trim(), isClosed: true })
}
