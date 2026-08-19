import { ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ManagePollView from '@/views/ManagePollView.vue'

const apiMock = vi.hoisted(() => ({
  closePoll: vi.fn(),
  getPoll: vi.fn(),
}))

const authMock = vi.hoisted(() => ({
  invalidateAuthentication: vi.fn(),
}))

const liveResultsMock = vi.hoisted(() => ({
  useLivePollResults: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  closePoll: apiMock.closePoll,
  getPoll: apiMock.getPoll,
}))

vi.mock('@/auth/auth', () => ({
  invalidateAuthentication: authMock.invalidateAuthentication,
}))

vi.mock('@/composables/useLivePollResults', () => ({
  useLivePollResults: liveResultsMock.useLivePollResults,
}))

vi.mock('@/components/ResultsChart.vue', () => ({
  default: {
    props: ['options', 'totalVotes'],
    template: '<div data-test="results-chart">Chart total: {{ totalVotes }}</div>',
  },
}))

const samplePoll = {
  code: 'ABC123',
  question: 'Which day works best?',
  options: [
    { index: 0, text: 'Monday' },
    { index: 1, text: 'Tuesday' },
  ],
  isClosed: false,
}

const sampleResults = {
  code: 'ABC123',
  question: 'Which day works best?',
  options: [
    { index: 0, text: 'Monday', votes: 3, percentage: 75 },
    { index: 1, text: 'Tuesday', votes: 1, percentage: 25 },
  ],
  totalVotes: 4,
  isClosed: false,
}

const EmptyView = { template: '<div />' }
const mountedWrappers = []

function liveState(overrides = {}) {
  return {
    results: ref(sampleResults),
    isLoading: ref(false),
    isRefreshing: ref(false),
    error: ref(null),
    connectionStatus: ref('connected'),
    connectionError: ref(''),
    refresh: vi.fn(),
    cleanup: vi.fn(),
    ...overrides,
  }
}

async function mountManageView(code = 'ABC123') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/poll/:code/manage', name: 'manage-poll', component: ManagePollView },
      { path: '/poll/:code', name: 'vote', component: EmptyView },
      { path: '/poll/:code/results', name: 'poll-results', component: EmptyView },
      { path: '/login', name: 'login', component: EmptyView },
      { path: '/', name: 'home', component: EmptyView },
    ],
  })

  await router.push(`/poll/${code}/manage`)
  await router.isReady()

  const wrapper = mount(ManagePollView, {
    attachTo: document.body,
    global: {
      plugins: [router],
      stubs: { Teleport: true },
    },
  })
  mountedWrappers.push(wrapper)
  return { router, wrapper }
}

beforeEach(() => {
  apiMock.closePoll.mockReset()
  apiMock.getPoll.mockReset()
  authMock.invalidateAuthentication.mockReset()
  liveResultsMock.useLivePollResults.mockReset()

  apiMock.getPoll.mockResolvedValue(samplePoll)
  apiMock.closePoll.mockResolvedValue({ ...samplePoll, isClosed: true })
  liveResultsMock.useLivePollResults.mockReturnValue(liveState())
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
})

describe('ManagePollView', () => {
  it('closes an open poll after confirmation and preserves the displayed results', async () => {
    const { wrapper } = await mountManageView()
    await flushPromises()

    await wrapper.get('[data-test="open-close-dialog"]').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain(
      'Existing votes and results will not be deleted',
    )

    await wrapper.get('[data-test="confirm-close"]').trigger('click')
    await flushPromises()

    expect(apiMock.closePoll).toHaveBeenCalledExactlyOnceWith('ABC123')
    expect(wrapper.find('[data-test="open-close-dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Poll closed. Existing votes and results have been preserved.')
    expect(wrapper.get('[data-test="total-votes"]').text()).toBe('4')
    expect(wrapper.text()).toContain('Voting is closed')
  })

  it('cancels closure and restores focus to the Close poll button', async () => {
    const { wrapper } = await mountManageView()
    await flushPromises()

    const closeButton = wrapper.get('[data-test="open-close-dialog"]')
    closeButton.element.focus()
    await closeButton.trigger('click')
    await wrapper.get('[data-test="cancel-close"]').trigger('click')
    await flushPromises()

    expect(apiMock.closePoll).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(closeButton.element)
  })

  it('closes the confirmation dialog with Escape without calling the API', async () => {
    const { wrapper } = await mountManageView()
    await flushPromises()

    await wrapper.get('[data-test="open-close-dialog"]').trigger('click')
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(apiMock.closePoll).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('shows a clear ownership message after a 403 response', async () => {
    apiMock.closePoll.mockRejectedValue({ status: 403, message: 'Forbidden' })

    const { wrapper } = await mountManageView()
    await flushPromises()

    await wrapper.get('[data-test="open-close-dialog"]').trigger('click')
    await wrapper.get('[data-test="confirm-close"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('You do not own this poll, so you cannot close it.')
    expect(wrapper.find('[data-test="open-close-dialog"]').exists()).toBe(true)
  })

  it('invalidates an expired session and offers local login with the manage redirect', async () => {
    apiMock.closePoll.mockRejectedValue({ status: 401, message: 'Unauthorized' })

    const { router, wrapper } = await mountManageView()
    const routerPush = vi.spyOn(router, 'push').mockResolvedValue()
    await flushPromises()

    await wrapper.get('[data-test="open-close-dialog"]').trigger('click')
    await wrapper.get('[data-test="confirm-close"]').trigger('click')
    await flushPromises()

    expect(authMock.invalidateAuthentication).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Your session has expired. Sign in again')

    const loginButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Sign in again')
    await loginButton.trigger('click')
    await flushPromises()

    expect(routerPush).toHaveBeenCalledExactlyOnceWith({
      name: 'login',
      query: { redirect: '/poll/ABC123/manage' },
    })
  })

  it('treats an already-closed backend response as closed without deleting results', async () => {
    apiMock.closePoll.mockRejectedValue({ status: 409, message: 'Already closed' })

    const { wrapper } = await mountManageView()
    await flushPromises()

    await wrapper.get('[data-test="open-close-dialog"]').trigger('click')
    await wrapper.get('[data-test="confirm-close"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'This poll was already closed. Existing results remain available.',
    )
    expect(wrapper.find('[data-test="open-close-dialog"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="total-votes"]').text()).toBe('4')
  })

  it('does not offer the close action when the poll is already closed on load', async () => {
    apiMock.getPoll.mockResolvedValue({ ...samplePoll, isClosed: true })
    liveResultsMock.useLivePollResults.mockReturnValue(
      liveState({ results: ref({ ...sampleResults, isClosed: true }) }),
    )

    const { wrapper } = await mountManageView()
    await flushPromises()

    expect(wrapper.find('[data-test="open-close-dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Voting is closed')
    expect(wrapper.get('[data-test="total-votes"]').text()).toBe('4')
  })
})
