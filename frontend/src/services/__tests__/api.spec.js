import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  invalidateAuthentication: vi.fn(),
}))

vi.mock('@/auth/auth', () => ({
  getAccessToken: authMock.getAccessToken,
  invalidateAuthentication: authMock.invalidateAuthentication,
}))

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function loadApi() {
  return import('@/services/api')
}

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example/gateway')
  vi.stubGlobal('fetch', vi.fn())
  authMock.getAccessToken.mockReset()
  authMock.invalidateAuthentication.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('poll API authentication', () => {
  it('adds the AuthMana bearer token to protected poll requests', async () => {
    authMock.getAccessToken.mockResolvedValue('creator-jwt')
    fetch.mockResolvedValue(
      jsonResponse(
        {
          code: 'ABC123',
          question: 'A question?',
          options: ['Yes', 'No'],
        },
        201,
      ),
    )
    const api = await loadApi()

    await api.createPoll({ question: 'A question?', options: ['Yes', 'No'] })

    expect(authMock.getAccessToken).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer creator-jwt')
  })

  it('returns a normalized 401 without calling fetch when no token exists', async () => {
    authMock.getAccessToken.mockRejectedValue(new Error('No session'))
    const api = await loadApi()

    await expect(
      api.createPoll({ question: 'A question?', options: ['Yes', 'No'] }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Your session has expired. Please sign in again.',
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('invalidates the local session after a protected 401 response', async () => {
    authMock.getAccessToken.mockResolvedValue('expired-jwt')
    fetch.mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401))
    const api = await loadApi()

    await expect(api.closePoll('ABC123')).rejects.toMatchObject({ status: 401 })

    expect(authMock.invalidateAuthentication).toHaveBeenCalledOnce()
  })

  it('keeps poll loading, anonymous voting, and public results free of creator tokens', async () => {
    fetch
      .mockResolvedValueOnce(
        jsonResponse({
          code: 'ABC123',
          question: 'A question?',
          options: [
            { optionIndex: 0, optionText: 'Yes' },
            { optionIndex: 1, optionText: 'No' },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ accepted: true, code: 'ABC123', optionIndex: 0 }))
      .mockResolvedValueOnce(
        jsonResponse({
          code: 'ABC123',
          question: 'A question?',
          totalVotes: 1,
          options: [
            { optionIndex: 0, optionText: 'Yes', votes: 1 },
            { optionIndex: 1, optionText: 'No', votes: 0 },
          ],
        }),
      )
    const api = await loadApi()

    await api.getPoll('ABC123')
    await api.submitVote('ABC123', 0, 'anonymous-voter-token')
    await api.getPollResults('ABC123')

    expect(authMock.getAccessToken).not.toHaveBeenCalled()
    expect(fetch.mock.calls.every(([, options]) => !options.headers.has('Authorization'))).toBe(
      true,
    )
  })
})
