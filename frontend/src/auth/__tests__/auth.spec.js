import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function loadAuthentication() {
  return import('@/auth/auth')
}

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example/gateway')
  vi.stubGlobal('fetch', vi.fn())
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('local authentication', () => {
  it('initializes as signed out without making a request when no token exists', async () => {
    const auth = await loadAuthentication()

    await auth.initializeAuthentication()

    expect(fetch).not.toHaveBeenCalled()
    expect(auth.isLoading.value).toBe(false)
    expect(auth.isAuthenticated.value).toBe(false)
    expect(auth.user.value).toBeNull()
  })

  it('restores a stored session through the me endpoint', async () => {
    window.sessionStorage.setItem('poll_builder_auth_token', 'stored-token')
    fetch.mockResolvedValue(
      jsonResponse({ userID: 'user-7', userName: 'Duy Anh', email: 'duy@example.com' }),
    )
    const auth = await loadAuthentication()

    await auth.initializeAuthentication()

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][0]).toBe('https://api.example/gateway/auth/me')
    expect(fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer stored-token')
    expect(auth.isAuthenticated.value).toBe(true)
    expect(auth.user.value).toEqual({
      id: 'user-7',
      name: 'Duy Anh',
      email: 'duy@example.com',
    })
  })

  it('removes an invalid stored token', async () => {
    window.sessionStorage.setItem('poll_builder_auth_token', 'expired-token')
    window.sessionStorage.setItem('poll_builder_auth_user', '{"id":"old-user"}')
    fetch.mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401))
    const auth = await loadAuthentication()

    await auth.initializeAuthentication()

    expect(auth.isAuthenticated.value).toBe(false)
    expect(window.sessionStorage.getItem('poll_builder_auth_token')).toBeNull()
    expect(window.sessionStorage.getItem('poll_builder_auth_user')).toBeNull()
  })

  it('logs in, normalizes the response, and stores only the session token and user', async () => {
    fetch.mockResolvedValue(
      jsonResponse({
        Token: 'login-token',
        UserID: 'user-8',
        UserName: 'Creator',
        Email: 'creator@example.com',
      }),
    )
    const auth = await loadAuthentication()

    await auth.login({ email: 'creator@example.com', password: 'Password1!' })

    expect(auth.isAuthenticated.value).toBe(true)
    expect(auth.user.value).toEqual({
      id: 'user-8',
      name: 'Creator',
      email: 'creator@example.com',
    })
    expect(window.sessionStorage.getItem('poll_builder_auth_token')).toBe('login-token')
    expect(window.sessionStorage.getItem('poll_builder_auth_user')).not.toContain('Password1!')
  })

  it('returns a generic invalid-login error', async () => {
    fetch.mockResolvedValue(jsonResponse({ message: 'Invalid email or password.' }, 401))
    const auth = await loadAuthentication()

    await expect(
      auth.login({ email: 'unknown@example.com', password: 'Wrong1!' }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password.',
    })
    expect(auth.isAuthenticated.value).toBe(false)
  })

  it('registers without sending confirmPassword and starts a session', async () => {
    fetch.mockResolvedValue(
      jsonResponse({
        token: 'registration-token',
        userId: 'user-9',
        username: 'NewCreator',
        email: 'new@example.com',
      }),
    )
    const auth = await loadAuthentication()

    await auth.register({
      userName: 'NewCreator',
      email: 'new@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    })

    const requestBody = JSON.parse(fetch.mock.calls[0][1].body)
    expect(requestBody).toEqual({
      userName: 'NewCreator',
      email: 'new@example.com',
      password: 'Password1!',
    })
    expect(auth.isAuthenticated.value).toBe(true)
  })

  it('rejects a successful response without a token', async () => {
    fetch.mockResolvedValue(jsonResponse({ userID: 'user-without-token' }))
    const auth = await loadAuthentication()

    await expect(
      auth.login({ email: 'creator@example.com', password: 'Password1!' }),
    ).rejects.toMatchObject({
      message: 'The authentication service returned an invalid response.',
    })
  })

  it('logs out by clearing token and user state', async () => {
    fetch.mockResolvedValue(
      jsonResponse({
        token: 'logout-token',
        userID: 'user-10',
        userName: 'Creator',
        email: 'creator@example.com',
      }),
    )
    const auth = await loadAuthentication()
    await auth.login({ email: 'creator@example.com', password: 'Password1!' })

    auth.logout()

    expect(auth.isAuthenticated.value).toBe(false)
    expect(auth.user.value).toBeNull()
    expect(window.sessionStorage.getItem('poll_builder_auth_token')).toBeNull()
  })

  it('protects creator routes and rejects external redirects', async () => {
    const auth = await loadAuthentication()

    expect(await auth.protectRoute({ fullPath: '/poll/ABC123/manage' })).toEqual({
      name: 'login',
      query: { redirect: '/poll/ABC123/manage' },
    })
    expect(auth.safeRedirectPath('/poll/ABC123/manage', '/create')).toBe('/poll/ABC123/manage')
    expect(auth.safeRedirectPath('https://evil.example/steal', '/create')).toBe('/create')
    expect(auth.safeRedirectPath('//evil.example/steal', '/create')).toBe('/create')
  })
})
