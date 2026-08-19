import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppHeader from '@/components/AppHeader.vue'

const authMock = vi.hoisted(() => ({
  isLoading: { __v_isRef: true, value: false },
  isAuthenticated: { __v_isRef: true, value: false },
  user: { __v_isRef: true, value: null },
  errorMessage: { __v_isRef: true, value: null },
  logout: vi.fn(),
}))

vi.mock('@/auth/auth', () => ({
  useAuthentication: () => authMock,
}))

async function mountHeader() {
  const EmptyView = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: EmptyView },
      { path: '/create', component: EmptyView },
      { path: '/login', name: 'login', component: EmptyView },
      { path: '/register', name: 'register', component: EmptyView },
    ],
  })

  await router.push('/')
  await router.isReady()

  return mount(AppHeader, {
    global: {
      plugins: [router],
    },
  })
}

afterEach(() => {
  authMock.isLoading.value = false
  authMock.isAuthenticated.value = false
  authMock.user.value = null
  authMock.errorMessage.value = null
  authMock.logout.mockReset()
})

describe('AppHeader', () => {
  it('shows a neutral state while authentication initializes', async () => {
    authMock.isLoading.value = true
    const wrapper = await mountHeader()

    expect(wrapper.get('.brand-name').text()).toBe('Poll Builder')
    expect(wrapper.get('[role="status"]').text()).toContain('Checking sign-in status')
    expect(wrapper.text()).not.toContain('Log in')
    expect(wrapper.text()).not.toContain('Log out')
    expect(wrapper.text()).not.toContain('Create a poll')
  })

  it('offers login when the user is signed out', async () => {
    const wrapper = await mountHeader()

    expect(wrapper.get('nav').attributes('aria-label')).toBe('Primary navigation')
    expect(wrapper.get('a[href="/login"]').text()).toBe('Log in')
    expect(wrapper.get('a[href="/register"]').text()).toBe('Register')
  })

  it('offers create and logout actions when the user is signed in', async () => {
    authMock.isAuthenticated.value = true
    authMock.user.value = { name: 'Poll Creator' }
    const wrapper = await mountHeader()

    expect(wrapper.get('.user-name').text()).toBe('Poll Creator')
    expect(wrapper.get('a[href="/create"]').text()).toBe('Create a poll')
    expect(wrapper.get('button').text()).toBe('Log out')

    await wrapper.get('button').trigger('click')
    expect(authMock.logout).toHaveBeenCalledOnce()
  })
})
