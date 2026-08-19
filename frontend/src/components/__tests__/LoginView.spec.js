import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoginView from '@/views/LoginView.vue'

const authMock = vi.hoisted(() => ({
  login: vi.fn(),
}))

vi.mock('@/auth/auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, login: authMock.login }
})

const EmptyView = { template: '<div />' }
const mountedWrappers = []

async function mountLogin(path = '/login') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginView },
      { path: '/register', name: 'register', component: EmptyView },
      { path: '/create', name: 'create-poll', component: EmptyView },
      { path: '/poll/:code/manage', name: 'manage-poll', component: EmptyView },
    ],
  })

  await router.push(path)
  await router.isReady()

  const wrapper = mount(LoginView, { global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
  return { router, wrapper }
}

async function completeForm(wrapper) {
  await wrapper.get('#login-email').setValue('creator@example.com')
  await wrapper.get('#login-password').setValue('Password1!')
}

beforeEach(() => {
  authMock.login.mockReset()
  authMock.login.mockResolvedValue({ id: 'creator-1' })
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
})

describe('LoginView', () => {
  it('logs in and returns to a safe local redirect', async () => {
    const { router, wrapper } = await mountLogin('/login?redirect=/poll/ABC123/manage')
    await completeForm(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(authMock.login).toHaveBeenCalledExactlyOnceWith({
      email: 'creator@example.com',
      password: 'Password1!',
    })
    expect(router.currentRoute.value.fullPath).toBe('/poll/ABC123/manage')
  })

  it('rejects an external redirect and opens the create page', async () => {
    const { router, wrapper } = await mountLogin(
      '/login?redirect=https%3A%2F%2Fevil.example%2Fsteal',
    )
    await completeForm(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/create')
  })

  it('shows missing-field validation without calling the backend', async () => {
    const { wrapper } = await mountLogin()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Email is required.')
    expect(wrapper.text()).toContain('Password is required.')
    expect(authMock.login).not.toHaveBeenCalled()
  })

  it('displays invalid-credential errors from the authentication service', async () => {
    authMock.login.mockRejectedValue({
      status: 401,
      message: 'Invalid email or password.',
    })
    const { wrapper } = await mountLogin()
    await completeForm(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Invalid email or password.')
  })

  it('prevents duplicate submissions while login is pending', async () => {
    let resolveLogin
    authMock.login.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve
      }),
    )
    const { wrapper } = await mountLogin()
    await completeForm(wrapper)

    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')

    expect(authMock.login).toHaveBeenCalledOnce()
    resolveLogin({ id: 'creator-1' })
    await flushPromises()
  })
})
