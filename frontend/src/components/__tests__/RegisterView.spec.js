import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RegisterView from '@/views/RegisterView.vue'

const authMock = vi.hoisted(() => ({
  register: vi.fn(),
}))

vi.mock('@/auth/auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, register: authMock.register }
})

const EmptyView = { template: '<div />' }
const mountedWrappers = []

async function mountRegister(path = '/register') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/register', name: 'register', component: RegisterView },
      { path: '/login', name: 'login', component: EmptyView },
      { path: '/create', name: 'create-poll', component: EmptyView },
      { path: '/poll/:code/manage', name: 'manage-poll', component: EmptyView },
    ],
  })

  await router.push(path)
  await router.isReady()

  const wrapper = mount(RegisterView, { global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
  return { router, wrapper }
}

async function completeForm(wrapper, password = 'Password1!') {
  await wrapper.get('#register-username').setValue('NewCreator')
  await wrapper.get('#register-email').setValue('new@example.com')
  await wrapper.get('#register-password').setValue(password)
  await wrapper.get('#register-confirm-password').setValue(password)
}

beforeEach(() => {
  authMock.register.mockReset()
  authMock.register.mockResolvedValue({ id: 'creator-2' })
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
})

describe('RegisterView', () => {
  it('registers without confirmPassword and returns to a safe local redirect', async () => {
    const { router, wrapper } = await mountRegister('/register?redirect=/poll/ABC123/manage')
    await completeForm(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(authMock.register).toHaveBeenCalledExactlyOnceWith({
      userName: 'NewCreator',
      email: 'new@example.com',
      password: 'Password1!',
    })
    expect(router.currentRoute.value.fullPath).toBe('/poll/ABC123/manage')
  })

  it('enforces the ASP.NET Identity password rules and matching confirmation', async () => {
    const { wrapper } = await mountRegister()
    await wrapper.get('#register-username').setValue('NewCreator')
    await wrapper.get('#register-email').setValue('new@example.com')
    await wrapper.get('#register-password').setValue('simple')
    await wrapper.get('#register-confirm-password').setValue('different')

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('one uppercase letter')
    expect(wrapper.text()).toContain('one digit')
    expect(wrapper.text()).toContain('one non-alphanumeric character')
    expect(wrapper.text()).toContain('Passwords do not match.')
    expect(authMock.register).not.toHaveBeenCalled()
  })

  it('displays ASP.NET Identity validation errors', async () => {
    authMock.register.mockRejectedValue({
      status: 400,
      message: 'Registration failed.',
      validationErrors: [
        'Passwords must have at least one non alphanumeric character.',
        'Username is already taken.',
      ],
    })
    const { wrapper } = await mountRegister()
    await completeForm(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Passwords must have at least one non alphanumeric character.',
    )
    expect(wrapper.get('[role="alert"]').text()).toContain('Username is already taken.')
  })

  it('rejects an external redirect after successful registration', async () => {
    const { router, wrapper } = await mountRegister('/register?redirect=%2F%2Fevil.example%2Fsteal')
    await completeForm(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/create')
  })
})
