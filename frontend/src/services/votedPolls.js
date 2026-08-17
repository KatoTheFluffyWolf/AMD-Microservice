const STORAGE_KEY = 'poll_builder_voted_polls'

// This list only improves the UI (for example, by disabling a repeat-vote button).
// It is not a security control. The API/database must enforce one vote per voter token.

function storage() {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function normalizedCode(code) {
  return String(code ?? '').trim().toUpperCase()
}

function readVotedPolls() {
  try {
    const storedValue = storage()?.getItem(STORAGE_KEY)
    const parsed = storedValue ? JSON.parse(storedValue) : []

    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((code) => typeof code === 'string').map(normalizedCode))]
      : []
  } catch {
    return []
  }
}

export function hasVotedLocally(code) {
  const pollCode = normalizedCode(code)
  return pollCode ? readVotedPolls().includes(pollCode) : false
}

export function markVotedLocally(code) {
  const pollCode = normalizedCode(code)
  if (!pollCode) return

  const votedPolls = new Set(readVotedPolls())
  votedPolls.add(pollCode)

  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify([...votedPolls]))
  } catch {
    // Voting has already succeeded; unavailable storage must not turn it into a UI error.
  }
}