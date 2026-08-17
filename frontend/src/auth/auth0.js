import { createAuth0 } from '@auth0/auth0-vue'
import { computed, ref, watch } from 'vue'

const AUTH_READY_TIMEOUT_MS = 15_000
const REDIRECT_URI = typeof window === 'undefined' ? undefined : window.location.origin

const auth0Config = Object.freeze({
  domain: import.meta.env.VITE_AUTH0_DOMAIN?.trim(),
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID?.trim(),
  audience: import.meta.env.VITE_AUTH0_AUDIENCE?.trim(),
})

function isPlaceholder(value) {
  return !value || value.startsWith('your-')
}

export const isAuthenticationConfigured = Object.values(auth0Config).every(
  (value) => !isPlaceholder(value),
)

const auth0Client = isAuthenticationConfigured
  ? createAuth0(
      {
        domain: auth0Config.domain,
        clientId: auth0Config.clientId,
        authorizationParams: {
          audience: auth0Config.audience,
          redirect_uri: REDIRECT_URI,
        },
      },
      {
        // Callback failures return to a public route, preventing a protected-route redirect loop.
        errorPath: '/',
      },
    )
  : null

const installationFailed = ref(false)
let loginRedirectInProgress = false

export const authenticationState = Object.freeze({
  isLoading: computed(() => auth0Client?.isLoading.value ?? false),
  isAuthenticated: computed(() => auth0Client?.isAuthenticated.value ?? false),
  user: computed(() => auth0Client?.user.value),
  errorMessage: computed(() => {
    if (!isAuthenticationConfigured) {
      return 'Authentication is not configured for this environment.'
    }

    if (installationFailed.value || auth0Client?.error.value) {
      return 'We could not complete authentication. Please return home and try again.'
    }

    return null
  }),
})

export class AuthenticationError extends Error {
  constructor(message = 'We could not verify your session. Please sign in again.') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export function installAuthentication(app) {
  if (!auth0Client) return

  try {
    app.use(auth0Client)
  } catch {
    installationFailed.value = true
    auth0Client.isLoading.value = false
  }
}

function localReturnPath(returnTo) {
  if (typeof window === 'undefined') return '/'

  try {
    const target = new URL(returnTo || '/', window.location.origin)
    return target.origin === window.location.origin
      ? `${target.pathname}${target.search}${target.hash}`
      : '/'
  } catch {
    return '/'
  }
}

async function waitForAuthentication() {
  if (!auth0Client || installationFailed.value) {
    throw new AuthenticationError('Authentication is unavailable in this environment.')
  }

  if (!auth0Client.isLoading.value) return

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      stopWatching()
      reject(new AuthenticationError())
    }, AUTH_READY_TIMEOUT_MS)

    const stopWatching = watch(auth0Client.isLoading, (isLoading) => {
      if (isLoading) return

      clearTimeout(timer)
      stopWatching()
      resolve()
    })
  })
}

export async function login(returnTo) {
  if (!auth0Client || installationFailed.value) {
    throw new AuthenticationError('Authentication is unavailable in this environment.')
  }

  if (loginRedirectInProgress) return
  loginRedirectInProgress = true

  try {
    await auth0Client.loginWithRedirect({
      appState: { target: localReturnPath(returnTo) },
      authorizationParams: {
        audience: auth0Config.audience,
        redirect_uri: REDIRECT_URI,
      },
    })
  } catch {
    loginRedirectInProgress = false
    throw new AuthenticationError('Sign-in could not be started. Please try again.')
  }
}

export async function logout() {
  if (!auth0Client || installationFailed.value) {
    throw new AuthenticationError('Authentication is unavailable in this environment.')
  }

  try {
    await auth0Client.logout({
      logoutParams: { returnTo: REDIRECT_URI },
    })
  } catch {
    throw new AuthenticationError('Sign-out could not be completed. Please try again.')
  }
}

export async function getAccessToken() {
  await waitForAuthentication()

  if (!auth0Client.isAuthenticated.value) {
    throw new AuthenticationError()
  }

  try {
    return await auth0Client.getAccessTokenSilently({
      authorizationParams: { audience: auth0Config.audience },
    })
  } catch {
    throw new AuthenticationError()
  }
}

export async function protectRoute(to) {
  if (!isAuthenticationConfigured || installationFailed.value) {
    return { name: 'home', query: { auth: 'unavailable' } }
  }

  try {
    await waitForAuthentication()

    if (auth0Client.isAuthenticated.value) return true
    if (auth0Client.error.value) {
      return { name: 'home', query: { auth: 'failed' } }
    }

    await login(to.fullPath)
    return false
  } catch {
    return { name: 'home', query: { auth: 'failed' } }
  }
}

export function useAuthentication() {
  return {
    ...authenticationState,
    login,
    logout,
  }
}
