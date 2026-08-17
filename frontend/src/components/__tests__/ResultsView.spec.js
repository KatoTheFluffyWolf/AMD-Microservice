import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ResultsView from '@/views/ResultsView.vue'

const apiMock = vi.hoisted(() => ({
  getPollResults: vi.fn(),
}))

const signalrMock = vi.hoisted(() => ({
  createPollResultsConnection: vi.fn(),
  current: null,
}))

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getPollResults: apiMock.getPollResults,
  }
})

vi.mock('@/services/signalr', () => ({
  createPollResultsConnection: signalrMock.createPollResultsConnection,
}))

vi.mock('@/components/ResultsChart.vue', () => ({
  default: {
    props: ['options', 'totalVotes'],
    template: '<div data-test="results-chart">Chart total: {{ totalVotes }}</div>',
  },
}))

const initialResults = {
  code: 'ABC123',
  question: 'Which day works best?',
  options: [
    { index: 0, text: 'Monday', votes: 1, percentage: 100 },
    { index: 1, text: 'Tuesday', votes: 0, percentage: 0 },
  ],
  totalVotes: 1,
  isClosed: false,
}

const mountedWrappers = []

async function mountResultsView(code = 'ABC123') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/poll/:code/results', name: 'poll-results', component: ResultsView },
      { path: '/poll/:code', name: 'vote', component: { template: '<div />' } },
    ],
  })

  await router.push(`/poll/${code}/results`)
  await router.isReady()

  const wrapper = mount(ResultsView, { global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
  return { router, wrapper }
}

beforeEach(() => {
  apiMock.getPollResults.mockReset()
  signalrMock.createPollResultsConnection.mockReset()
  signalrMock.current = null

  apiMock.getPollResults.mockResolvedValue(initialResults)
  signalrMock.createPollResultsConnection.mockImplementation((handlers) => {
    const connection = {
      start: vi.fn(async () => handlers.onStatusChange('connected')),
      stop: vi.fn().mockResolvedValue(undefined),
    }
    signalrMock.current = { connection, handlers }
    return connection
  })
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
})

describe('ResultsView', () => {
  it('loads the initial API snapshot and starts one live connection', async () => {
    const { wrapper } = await mountResultsView()
    await flushPromises()

    expect(apiMock.getPollResults).toHaveBeenCalledExactlyOnceWith('ABC123')
    expect(signalrMock.createPollResultsConnection).toHaveBeenCalledOnce()
    expect(signalrMock.current.connection.start).toHaveBeenCalledOnce()
    expect(wrapper.get('h2').text()).toBe('Which day works best?')
    expect(wrapper.get('[data-test="total-votes"]').text()).toBe('1')
    expect(wrapper.text()).toContain('Updating live')
  })

  it('applies a complete matching ResultsUpdated event to the displayed totals', async () => {
    const { wrapper } = await mountResultsView()
    await flushPromises()

    signalrMock.current.handlers.onResultsUpdated({
      code: 'ABC123',
      question: 'Which day works best?',
      options: [
        { index: 0, text: 'Monday', votes: 2 },
        { index: 1, text: 'Tuesday', votes: 3 },
      ],
      totalVotes: 5,
      isClosed: false,
    })
    await flushPromises()

    expect(wrapper.get('[data-test="total-votes"]').text()).toBe('5')
    expect(wrapper.get('[data-test="results-chart"]').text()).toContain('5')
    expect(apiMock.getPollResults).toHaveBeenCalledOnce()
  })

  it('does not let a late initial response overwrite a newer complete live event', async () => {
    let resolveInitialResults
    apiMock.getPollResults.mockReturnValue(
      new Promise((resolve) => {
        resolveInitialResults = resolve
      }),
    )

    const { wrapper } = await mountResultsView()
    await flushPromises()

    signalrMock.current.handlers.onResultsUpdated({
      code: 'ABC123',
      question: 'Which day works best?',
      options: [
        { index: 0, text: 'Monday', votes: 4 },
        { index: 1, text: 'Tuesday', votes: 2 },
      ],
      totalVotes: 6,
      isClosed: false,
    })
    await flushPromises()

    expect(wrapper.get('[data-test="total-votes"]').text()).toBe('6')

    resolveInitialResults(initialResults)
    await flushPromises()

    expect(wrapper.get('[data-test="total-votes"]').text()).toBe('6')
  })

  it('fetches the latest snapshot for a code-only ResultsUpdated notification', async () => {
    apiMock.getPollResults
      .mockResolvedValueOnce(initialResults)
      .mockResolvedValueOnce({
        ...initialResults,
        totalVotes: 4,
        options: [
          { index: 0, text: 'Monday', votes: 3, percentage: 75 },
          { index: 1, text: 'Tuesday', votes: 1, percentage: 25 },
        ],
      })

    const { wrapper } = await mountResultsView()
    await flushPromises()

    signalrMock.current.handlers.onResultsUpdated({ pollCode: 'ABC123' })
    await flushPromises()

    expect(apiMock.getPollResults).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-test="total-votes"]').text()).toBe('4')
  })

  it('ignores ResultsUpdated events belonging to a different poll', async () => {
    const { wrapper } = await mountResultsView()
    await flushPromises()

    signalrMock.current.handlers.onResultsUpdated({
      code: 'OTHER',
      question: 'Another poll',
      options: [{ index: 0, text: 'Other', votes: 99 }],
      totalVotes: 99,
    })
    await flushPromises()

    expect(wrapper.get('[data-test="total-votes"]').text()).toBe('1')
    expect(apiMock.getPollResults).toHaveBeenCalledOnce()
  })

  it('shows a not-found state for a 404 API response', async () => {
    apiMock.getPollResults.mockRejectedValue({
      status: 404,
      message: 'The requested poll could not be found.',
    })

    const { wrapper } = await mountResultsView('MISSING')
    await flushPromises()

    expect(wrapper.text()).toContain('This poll does not exist')
    expect(wrapper.text()).toContain('Check the poll code')
  })

  it('offers manual refresh when the live connection is disconnected', async () => {
    apiMock.getPollResults
      .mockResolvedValueOnce(initialResults)
      .mockResolvedValueOnce({ ...initialResults, totalVotes: 2 })

    const { wrapper } = await mountResultsView()
    await flushPromises()

    signalrMock.current.handlers.onError('The live connection stopped.')
    signalrMock.current.handlers.onStatusChange('disconnected')
    await flushPromises()

    const refreshButton = wrapper.findAll('button').find((button) => button.text() === 'Refresh')
    expect(refreshButton).toBeDefined()

    await refreshButton.trigger('click')
    await flushPromises()

    expect(apiMock.getPollResults).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-test="total-votes"]').text()).toBe('2')
  })

  it('stops the live connection during cleanup', async () => {
    const { wrapper } = await mountResultsView()
    await flushPromises()
    const stop = signalrMock.current.connection.stop

    wrapper.unmount()
    await flushPromises()

    expect(stop).toHaveBeenCalledOnce()
  })
})
