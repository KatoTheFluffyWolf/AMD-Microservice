import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CreatePollView from '@/views/CreatePollView.vue'

const apiMock = vi.hoisted(() => ({
  createPoll: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  createPoll: apiMock.createPoll,
}))

const EmptyView = { template: '<div />' }
const mountedWrappers = []

async function mountCreatePoll() {
  const history = createMemoryHistory()
  const router = createRouter({
    history,
    routes: [
      { path: '/', name: 'home', component: EmptyView },
      { path: '/create', name: 'create-poll', component: CreatePollView },
      { path: '/poll/:code/manage', name: 'manage-poll', component: EmptyView },
    ],
  })

  await router.push('/create')
  await router.isReady()

  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
  return { history, router, wrapper }
}

async function completeValidForm(wrapper) {
  await wrapper.get('[data-test="question-input"]').setValue('Which day works best?')

  const optionInputs = wrapper.findAll('[data-test="option-input"]')
  await optionInputs[0].setValue('Monday')
  await optionInputs[1].setValue('Tuesday')
}

beforeEach(() => {
  apiMock.createPoll.mockReset()
  apiMock.createPoll.mockResolvedValue({ code: 'ABC123' })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
})

describe('CreatePollView', () => {
  it('starts with exactly two answer options', async () => {
    const { wrapper } = await mountCreatePoll()

    expect(wrapper.findAll('[data-test="option-input"]')).toHaveLength(2)
    expect(wrapper.get('[data-test="option-counter"]').text()).toBe('2 of 6 options')
  })

  it('adds options up to the six-option limit', async () => {
    const { wrapper } = await mountCreatePoll()
    const addButton = wrapper.get('[data-test="add-option"]')

    for (let count = 0; count < 5; count += 1) {
      await addButton.trigger('click')
    }

    expect(wrapper.findAll('[data-test="option-input"]')).toHaveLength(6)
    expect(addButton.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Six-option limit reached.')
  })

  it('does not remove options when only the required two remain', async () => {
    const { wrapper } = await mountCreatePoll()
    const removeButtons = wrapper.findAll('[data-test="remove-option"]')

    expect(removeButtons).toHaveLength(2)
    expect(removeButtons.every((button) => button.attributes('disabled') !== undefined)).toBe(true)
    await removeButtons[0].trigger('click')
    expect(wrapper.findAll('[data-test="option-input"]')).toHaveLength(2)
  })

  it('rejects duplicate options after trimming and without regard to case', async () => {
    const { wrapper } = await mountCreatePoll()
    await wrapper.get('[data-test="question-input"]').setValue('Which colour should we use?')

    const optionInputs = wrapper.findAll('[data-test="option-input"]')
    await optionInputs[0].setValue('  Blue ')
    await optionInputs[0].trigger('blur')
    await optionInputs[1].setValue('blue')
    await optionInputs[1].trigger('blur')

    expect(wrapper.findAll('.input-field__error').map((error) => error.text())).toEqual([
      'Answer options must be different.',
      'Answer options must be different.',
    ])
    expect(wrapper.get('[data-test="create-poll"]').attributes('disabled')).toBeDefined()
  })

  it('submits trimmed data and navigates to the refresh-safe manage route', async () => {
    const { history, router, wrapper } = await mountCreatePoll()
    await wrapper.get('[data-test="question-input"]').setValue('  Which day works best?  ')

    const optionInputs = wrapper.findAll('[data-test="option-input"]')
    await optionInputs[0].setValue('  Monday ')
    await optionInputs[1].setValue('Tuesday  ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(apiMock.createPoll).toHaveBeenCalledExactlyOnceWith({
      question: 'Which day works best?',
      options: ['Monday', 'Tuesday'],
    })
    expect(router.currentRoute.value.fullPath).toBe('/poll/ABC123/manage')
    expect(history.state.pollCreated).toBe(true)
  })

  it('associates backend validation errors with their fields', async () => {
    apiMock.createPoll.mockRejectedValue({
      message: 'Check the highlighted fields.',
      validationErrors: {
        Question: ['The server rejected this question.'],
        'Options[1]': ['The server rejected this option.'],
      },
    })

    const { wrapper } = await mountCreatePoll()
    await completeValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('#question-error').text()).toBe('The server rejected this question.')
    expect(wrapper.findAll('.input-field__error')[0].text()).toBe(
      'The server rejected this option.',
    )
  })

  it('prevents repeated submissions while the first request is pending', async () => {
    let resolveRequest
    apiMock.createPoll.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )

    const { wrapper } = await mountCreatePoll()
    await completeValidForm(wrapper)

    const form = wrapper.get('form')
    await form.trigger('submit')
    await form.trigger('submit')

    expect(apiMock.createPoll).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-test="create-poll"]').attributes('disabled')).toBeDefined()

    resolveRequest({ code: 'ONLYONCE' })
    await flushPromises()
  })
})