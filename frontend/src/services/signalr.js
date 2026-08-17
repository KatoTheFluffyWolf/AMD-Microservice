import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr'

export const RESULTS_UPDATED_EVENT = 'ResultsUpdated'
export const JOIN_POLL_GROUP_METHOD = 'JoinPollGroup'
export const LEAVE_POLL_GROUP_METHOD = 'LeavePollGroup'

const SIGNALR_HUB_URL = (import.meta.env.VITE_SIGNALR_HUB_URL ?? '').trim()

function readableConnectionError(error, fallback) {
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim()
  }

  return fallback
}

export function createPollResultsConnection({
  code,
  onResultsUpdated,
  onStatusChange,
  onError,
}) {
  const pollCode = String(code ?? '').trim()
  let connectionStatus = 'idle'
  let connectionError = ''
  let startPromise = null
  let stopPromise = null
  let disposed = false

  function setStatus(status) {
    connectionStatus = status
    onStatusChange?.(status)
  }

  function setError(message) {
    connectionError = message
    onError?.(message)
  }

  const connection = SIGNALR_HUB_URL
    ? new HubConnectionBuilder()
        .withUrl(SIGNALR_HUB_URL)
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build()
    : null

  const handleResultsUpdated = (payload) => {
    if (!disposed) onResultsUpdated?.(payload)
  }

  async function joinPollGroup() {
    if (!connection || disposed) return
    await connection.invoke(JOIN_POLL_GROUP_METHOD, pollCode)
  }

  if (connection) {
    // Register before start so an update cannot be missed immediately after joining.
    connection.on(RESULTS_UPDATED_EVENT, handleResultsUpdated)

    connection.onreconnecting((error) => {
      if (disposed) return
      setStatus('reconnecting')
      setError(
        readableConnectionError(
          error,
          'The live connection was interrupted. Reconnecting…',
        ),
      )
    })

    connection.onreconnected(async () => {
      if (disposed) return
      setStatus('reconnecting')

      try {
        await joinPollGroup()
        setError('')
        setStatus('connected')
      } catch (error) {
        setError(
          readableConnectionError(
            error,
            'The live connection returned, but the poll group could not be rejoined.',
          ),
        )
        setStatus('disconnected')
      }
    })

    connection.onclose((error) => {
      if (disposed) return
      setStatus('disconnected')
      setError(
        readableConnectionError(
          error,
          'Live updates are unavailable. You can refresh the results manually.',
        ),
      )
    })
  }

  async function start() {
    if (disposed) return
    if (startPromise) return startPromise

    startPromise = (async () => {
      if (!connection) {
        setStatus('disconnected')
        setError('Live results are not configured for this environment.')
        return
      }

      setStatus('connecting')
      setError('')

      try {
        await connection.start()

        if (disposed) {
          await connection.stop()
          return
        }

        await joinPollGroup()
        setStatus('connected')
      } catch (error) {
        if (disposed) return
        setStatus('disconnected')
        setError(
          readableConnectionError(
            error,
            'Live updates could not be started. You can refresh the results manually.',
          ),
        )
      }
    })()

    return startPromise
  }

  async function stop() {
    if (stopPromise) return stopPromise
    disposed = true

    stopPromise = (async () => {
      if (!connection) {
        setStatus('disconnected')
        return
      }

      try {
        await startPromise
      } catch {
        // Cleanup must continue even when startup failed.
      }

      if (connection.state === HubConnectionState.Connected) {
        try {
          await connection.invoke(LEAVE_POLL_GROUP_METHOD, pollCode)
        } catch {
          // Stopping the connection is still required if leaving the group fails.
        }
      }

      connection.off(RESULTS_UPDATED_EVENT, handleResultsUpdated)

      try {
        await connection.stop()
      } finally {
        setStatus('disconnected')
      }
    })()

    return stopPromise
  }

  return {
    start,
    stop,
    getConnectionStatus: () => connectionStatus,
    getConnectionError: () => connectionError,
  }
}
