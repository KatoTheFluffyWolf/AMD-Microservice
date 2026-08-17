const STORAGE_KEY = 'poll_builder_voter_token'

let inMemoryToken = null

function storage() {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function fallbackUuid() {
  const bytes = new Uint8Array(16)

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}

function createToken() {
  return globalThis.crypto?.randomUUID?.() ?? fallbackUuid()
}

export function getVoterToken() {
  const localStorage = storage()

  try {
    const storedToken = localStorage?.getItem(STORAGE_KEY)?.trim()
    if (storedToken) {
      inMemoryToken = storedToken
      return storedToken
    }
  } catch {
    // Fall through to the module-level token when storage is blocked.
  }

  if (!inMemoryToken) inMemoryToken = createToken()

  try {
    localStorage?.setItem(STORAGE_KEY, inMemoryToken)
  } catch {
    // The same token is still reused for the lifetime of this page.
  }

  return inMemoryToken
}