import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import CopyLinkButton from '@/components/CopyLinkButton.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PollStatusBadge from '@/components/PollStatusBadge.vue'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('BaseButton', () => {
  it('uses submit semantics and blocks repeated clicks while loading', async () => {
    const wrapper = mount(BaseButton, {
      props: { type: 'submit', loading: true, loadingText: 'Creating…' },
      slots: { default: 'Create poll' },
    })

    const button = wrapper.get('button')
    expect(button.attributes('type')).toBe('submit')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.text()).toBe('Creating…')

    await button.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('navigates when used as a router link', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/create', component: { template: '<div />' } },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(BaseButton, {
      props: { to: '/create' },
      slots: { default: 'Create a poll' },
      global: { plugins: [router] },
    })

    await wrapper.get('a').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/create')
  })
})

describe('BaseInput', () => {
  it('connects its label, help text, and validation message accessibly', async () => {
    const wrapper = mount(BaseInput, {
      props: {
        id: 'question',
        label: 'Poll question',
        modelValue: '',
        helpText: 'Keep it concise.',
        errorMessage: 'A question is required.',
        required: true,
      },
    })

    const input = wrapper.get('input')
    expect(wrapper.get('label').attributes('for')).toBe('question')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe('question-help question-error')
    expect(wrapper.get('[role="alert"]').text()).toContain('A question is required.')

    await input.setValue('Where should we meet?')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Where should we meet?'])
  })
})

describe('feedback components', () => {
  it('emits a retry request from ErrorAlert', async () => {
    const wrapper = mount(ErrorAlert, {
      props: { message: 'The poll could not be loaded.', retryable: true },
    })

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('announces loading and poll status in text', () => {
    const loading = mount(LoadingState, { props: { message: 'Loading poll…' } })
    const closed = mount(PollStatusBadge, { props: { isClosed: true } })

    expect(loading.get('[role="status"]').text()).toBe('Loading poll…')
    expect(closed.text()).toBe('Closed')
    expect(closed.attributes('aria-label')).toBe('Poll status: Closed')
  })

  it('copies a link and displays success feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const wrapper = mount(CopyLinkButton, {
      props: { value: 'https://polls.example/poll/ABC123' },
    })

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('https://polls.example/poll/ABC123')
    expect(wrapper.get('[role="status"]').text()).toBe('Copied')
    expect(wrapper.emitted('copied')).toHaveLength(1)
    wrapper.unmount()
  })
})