import { computed, onBeforeUnmount, onMounted, ref, unref, watch } from 'vue'
import { getPollResults, normalizePollResults } from '@/services/api'
import { createPollResultsConnection } from '@/services/signalr'

function normalizedCode(value) {
  return String(value ?? '').trim().toUpperCase()
}

function valueFrom(source, ...keys) {
  if (!source || typeof source !== 'object') return undefined

  for (const key of keys) {
    if (source[key] !== undefined) return source[key]
  }

  return undefined
}

function eventPollCode(payload) {
  if (typeof payload === 'string' || typeof payload === 'number') {
    return normalizedCode(payload)
  }

  const directCode = valueFrom(payload, 'code', 'pollCode', 'Code', 'PollCode')
  if (directCode !== undefined) return normalizedCode(directCode)

  for (const key of ['result', 'results', 'data', 'payload']) {
    const nestedCode = valueFrom(payload?.[key], 'code', 'pollCode', 'Code', 'PollCode')
    if (nestedCode !== undefined) return normalizedCode(nestedCode)
  }

  return ''
}

function completeResultCandidate(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null

  const candidates = [
    payload.result,
    payload.data,
    payload.payload,
    !Array.isArray(payload.results) ? payload.results : null,
    payload,
  ]

  return (
    candidates.find((candidate) => {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false

      const question = valueFrom(candidate, 'question', 'Question')
      const options = valueFrom(candidate, 'options', 'results', 'Options', 'Results')
      return typeof question === 'string' && Array.isArray(options)
    }) ?? null
  )
}

function normalizedRequestError(error) {
  return {
    status: Number.isFinite(error?.status) ? error.status : 0,
    message:
      typeof error?.message === 'string' && error.message.trim()
        ? error.message.trim()
        : 'The results could not be loaded. Check your connection and try again.',
  }
}

export function useLivePollResults(codeSource) {
  const results = ref(null)
  const isLoading = ref(true)
  const isRefreshing = ref(false)
  const error = ref(null)
  const connectionStatus = ref('idle')
  const connectionError = ref('')

  const currentCode = computed(() => String(unref(codeSource) ?? '').trim())

  let mounted = false
  let disposed = false
  let activationRevision = 0
  let requestRevision = 0
  let liveRevision = 0
  let liveConnection = null

  async function refresh({ background = false, activation = activationRevision } = {}) {
    const pollCode = currentCode.value
    if (!pollCode || disposed || activation !== activationRevision) return

    const thisRequest = ++requestRevision
    const liveRevisionAtStart = liveRevision
    isRefreshing.value = true
    if (!background && !results.value) isLoading.value = true
    error.value = null

    try {
      const latestResults = await getPollResults(pollCode)

      if (
        disposed ||
        activation !== activationRevision ||
        thisRequest !== requestRevision ||
        liveRevisionAtStart !== liveRevision
      ) {
        return
      }

      results.value = latestResults
    } catch (requestError) {
      if (
        disposed ||
        activation !== activationRevision ||
        thisRequest !== requestRevision ||
        liveRevisionAtStart !== liveRevision
      ) {
        return
      }

      error.value = normalizedRequestError(requestError)
    } finally {
      if (
        !disposed &&
        activation === activationRevision &&
        thisRequest === requestRevision
      ) {
        isLoading.value = false
        isRefreshing.value = false
      }
    }
  }

  function handleResultsUpdated(payload, pollCode, activation) {
    if (disposed || activation !== activationRevision) return

    const incomingCode = eventPollCode(payload)
    if (incomingCode && incomingCode !== normalizedCode(pollCode)) return

    const completeResult = completeResultCandidate(payload)

    if (incomingCode && completeResult) {
      liveRevision += 1
      requestRevision += 1
      results.value = normalizePollResults(completeResult, pollCode)
      error.value = null
      isLoading.value = false
      isRefreshing.value = false
      return
    }

    // Code-only and code-less group notifications require the authoritative API snapshot.
    void refresh({ background: Boolean(results.value), activation })
  }

  async function activatePoll(pollCode) {
    const activation = ++activationRevision
    requestRevision += 1
    liveRevision = 0

    const previousConnection = liveConnection
    liveConnection = null
    if (previousConnection) await previousConnection.stop()

    if (disposed || activation !== activationRevision) return

    results.value = null
    error.value = null
    connectionError.value = ''
    connectionStatus.value = 'idle'
    isLoading.value = true
    isRefreshing.value = false

    if (!pollCode) {
      error.value = { status: 400, message: 'A poll code is required.' }
      isLoading.value = false
      return
    }

    liveConnection = createPollResultsConnection({
      code: pollCode,
      onResultsUpdated: (payload) => handleResultsUpdated(payload, pollCode, activation),
      onStatusChange: (status) => {
        if (!disposed && activation === activationRevision) connectionStatus.value = status
      },
      onError: (message) => {
        if (!disposed && activation === activationRevision) connectionError.value = message
      },
    })

    // Both operations can proceed concurrently. Revisions prevent stale HTTP data from
    // overwriting a newer complete SignalR event.
    void refresh({ activation })
    void liveConnection.start()
  }

  async function cleanup() {
    if (disposed) return
    disposed = true
    activationRevision += 1
    requestRevision += 1

    const connection = liveConnection
    liveConnection = null
    if (connection) await connection.stop()
  }

  const stopCodeWatch = watch(currentCode, (newCode, oldCode) => {
    if (mounted && newCode !== oldCode) void activatePoll(newCode)
  })

  onMounted(() => {
    mounted = true
    void activatePoll(currentCode.value)
  })

  onBeforeUnmount(() => {
    mounted = false
    stopCodeWatch()
    void cleanup()
  })

  return {
    results,
    isLoading,
    isRefreshing,
    error,
    connectionStatus,
    connectionError,
    refresh,
    cleanup,
  }
}
