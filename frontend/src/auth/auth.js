import { computed, ref } from 'vue'

export const AUTH_TOKEN_STORAGE_KEY = 'poll_builder_auth_token'
export const AUTH_USER_STORAGE_KEY = 'poll_builder_auth_user'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')

const tokenState = ref('')
const userState = ref(null)
const loadingState = ref(true)
const errorState = ref('')

let initializationPromise = null
let initialized = false

export const isLoading = computed(() => loadingState.value)
export const isAuthenticated = computed(() => Boolean(tokenState.value && userState.value))
export const user = computed(() => userState.value)
export const errorMessage = computed(() => errorState.value || null)

export class AuthenticationError extends Error {
  constructor(message = 'We could not verify your session. Please sign in again.', options = {}) {
    super(message)
    this.name = 'AuthenticationError'
    this.status = Number.isFinite(options.status) ? options.status : 0
    this.validationErrors = Array.isArray(options.validationErrors) ? options.validationErrors : []
  }
}

function sessionStorageInstance() {
  if (typeof window === 'undefined') return null

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function valueFrom(source, ...keys) {
  if (!source || typeof source !== 'object') return undefined

  for (const key of keys) {
    if (source[key] !== undefined) return source[key]
  }

  return undefined
}

function normalizedUser(source) {
  const id = String(valueFrom(source, 'userID', 'userId', 'UserID', 'id', 'Id') ?? '').trim()
  const email = String(valueFrom(source, 'email', 'Email') ?? '').trim()
  const suppliedName = String(
    valueFrom(source, 'userName', 'username', 'UserName', 'name', 'Name') ?? '',
  ).trim()

  return {
    id,
    name: suppliedName || email,
    email,
  }
}

function authUrl(path) {
  if (!API_BASE_URL) {
    throw new AuthenticationError('Authentication is not configured for this environment.')
  }

  return `${API_BASE_URL}/${String(path).replace(/^\/+/, '')}`
}

async function parseResponse(response) {
  if (response.status === 204) return null

  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function safeMessage(value) {
  return typeof value === 'string' && value.trim() && value.length <= 240 ? value.trim() : ''
}

function validationErrorsFrom(payload) {
  const errors = valueFrom(payload, 'errors', 'Errors')
  if (!errors) return []

  const values = Array.isArray(errors) ? errors : Object.values(errors).flat()
  return [...new Set(values.map(safeMessage).filter(Boolean))]
}

function errorFromResponse(response, payload) {
  const validationErrors = validationErrorsFrom(payload)
  const serverMessage = safeMessage(valueFrom(payload, 'message', 'Message', 'detail', 'title'))
  const fallbackMessages = {
    400: 'Check the information you entered and try again.',
    401: 'Invalid email or password.',
    409: 'An account with these details already exists.',
  }

  return new AuthenticationError(
    serverMessage ||
      validationErrors[0] ||
      fallbackMessages[response.status] ||
      'Authentication could not be completed. Please try again.',
    { status: response.status, validationErrors },
  )
}

async function authenticationRequest(path, { method = 'GET', body, bearerToken } = {}) {
  const headers = new Headers({ Accept: 'application/json' })

  if (body !== undefined) headers.set('Content-Type', 'application/json')
  if (bearerToken) headers.set('Authorization', `Bearer ${bearerToken}`)

  let response
  try {
    response = await fetch(authUrl(path), {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch (error) {
    if (error instanceof AuthenticationError) throw error
    throw new AuthenticationError(
      'The authentication service could not be reached. Check your connection and try again.',
    )
  }

  const payload = await parseResponse(response)
  if (!response.ok) throw errorFromResponse(response, payload)
  return payload
}

function removeStoredSession() {
  const storage = sessionStorageInstance()

  try {
    storage?.removeItem(AUTH_TOKEN_STORAGE_KEY)
    storage?.removeItem(AUTH_USER_STORAGE_KEY)
  } catch {
    // In-memory authentication state is still cleared when storage is unavailable.
  }
}

function storeSession(token, normalizedUserValue) {
  const storage = sessionStorageInstance()

  try {
    storage?.setItem(AUTH_TOKEN_STORAGE_KEY, token)
    storage?.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(normalizedUserValue))
  } catch {
    // The current page can continue using its in-memory session.
  }
}

function readStoredToken() {
  try {
    return sessionStorageInstance()?.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

function clearAuthenticationState() {
  tokenState.value = ''
  userState.value = null
  removeStoredSession()
}

function acceptAuthenticationResponse(payload) {
  const responseToken = String(valueFrom(payload, 'token', 'Token') ?? '').trim()
  if (!responseToken) {
    throw new AuthenticationError('The authentication service returned an invalid response.')
  }

  const normalizedUserValue = normalizedUser(payload)
  tokenState.value = responseToken
  userState.value = normalizedUserValue
  storeSession(responseToken, normalizedUserValue)
  errorState.value = ''
  initialized = true

  return normalizedUserValue
}

export async function initializeAuthentication() {
  if (initialized) {
    loadingState.value = false
    return
  }

  if (initializationPromise) return initializationPromise

  initializationPromise = (async () => {
    loadingState.value = true
    errorState.value = ''

    const storedToken = readStoredToken()

    if (!storedToken) {
      clearAuthenticationState()
      initialized = true
      loadingState.value = false
      initializationPromise = null
      return
    }

    tokenState.value = storedToken
    userState.value = null

    try {
      const payload = await authenticationRequest('/auth/me', {
        bearerToken: storedToken,
      })
      const restoredUser = normalizedUser(payload)

      if (!restoredUser.id || (!restoredUser.name && !restoredUser.email)) {
        throw new AuthenticationError('The saved session could not be validated.')
      }

      userState.value = restoredUser
      storeSession(storedToken, restoredUser)
    } catch {
      clearAuthenticationState()
      errorState.value = 'Your saved session could not be verified. Please sign in again.'
    } finally {
      initialized = true
      loadingState.value = false
      initializationPromise = null
    }
  })()

  return initializationPromise
}

export async function login(credentials) {
  if (initializationPromise) await initializationPromise

  errorState.value = ''
  const payload = await authenticationRequest('/auth/login', {
    method: 'POST',
    body: {
      email: credentials?.email,
      password: credentials?.password,
    },
  })

  return acceptAuthenticationResponse(payload)
}

export async function register(details) {
  if (initializationPromise) await initializationPromise

  errorState.value = ''
  const payload = await authenticationRequest('/auth/register', {
    method: 'POST',
    body: {
      userName: details?.userName ?? details?.username,
      email: details?.email,
      password: details?.password,
    },
  })

  return acceptAuthenticationResponse(payload)
}

export function logout() {
  clearAuthenticationState()
  errorState.value = ''
  initialized = true
  loadingState.value = false
}

export function invalidateAuthentication(
  message = 'Your session has expired. Please sign in again.',
) {
  clearAuthenticationState()
  errorState.value = message
  initialized = true
  loadingState.value = false
}

export async function getAccessToken() {
  if (!initialized) await initializeAuthentication()

  if (!isAuthenticated.value || !tokenState.value) {
    throw new AuthenticationError()
  }

  return tokenState.value
}

export function safeRedirectPath(value, fallback = '/create') {
  if (typeof value !== 'string') return fallback

  const candidate = value.trim()
  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\') ||
    [...candidate].some((character) => character.charCodeAt(0) < 32)
  ) {
    return fallback
  }

  try {
    const baseOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
    const target = new URL(candidate, baseOrigin)
    if (target.origin !== baseOrigin) return fallback

    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return fallback
  }
}

export async function protectRoute(to) {
  await initializeAuthentication()
  if (isAuthenticated.value) return true

  return {
    name: 'login',
    query: {
      redirect: to.fullPath,
    },
  }
}

export function useAuthentication() {
  return {
    isLoading,
    isAuthenticated,
    user,
    errorMessage,
    initializeAuthentication,
    login,
    register,
    logout,
    getAccessToken,
    invalidateAuthentication,
    protectRoute,
  }
}
