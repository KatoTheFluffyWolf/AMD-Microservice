import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VoteView from '@/views/VoteView.vue'

const apiMock = vi.hoisted(() => ({
  getPoll: vi.fn(),
  submitVote: vi.fn(),
}))

const votedPollsMock = vi.hoisted(() => ({
  hasVotedLocally: vi.fn(),
  markVotedLocally: vi.fn(),
}))

const voterTokenMock = vi.hoisted(() => ({
  getVoterToken: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  getPoll: apiMock.getPoll,
  submitVote: apiMock.submitVote,
}))

vi.mock('@/services/votedPolls', () => ({
  hasVotedLocally: votedPollsMock.hasVotedLocally,
  markVotedLocally: votedPollsMock.markVotedLocally,
}))

vi.mock('@/services/voterToken', () => ({
  getVoterToken: voterTokenMock.getVoterToken,
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

const EmptyView = { template: '<div />' }
const mountedWrappers = []

async function mountVoteView(code = 'ABC123') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/poll/:code', name: 'vote', component: VoteView },
      { path: '/poll/:code/results', name: 'poll-results', component: EmptyView },
    ],
  })

  await router.push(`/poll/${code}`)
  await router.isReady()

  const wrapper = mount(VoteView, { global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
  return { router, wrapper }
}

beforeEach(() => {
  apiMock.getPoll.mockReset()
  apiMock.submitVote.mockReset()
  votedPollsMock.hasVotedLocally.mockReset()
  votedPollsMock.markVotedLocally.mockReset()
  voterTokenMock.getVoterToken.mockReset()

  apiMock.getPoll.mockResolvedValue(samplePoll)
  apiMock.submitVote.mockResolvedValue({ accepted: true })
  votedPollsMock.hasVotedLocally.mockReturnValue(false)
  voterTokenMock.getVoterToken.mockReturnValue('persistent-voter-token')
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
})

describe('VoteView', () => {
  it('loads the route poll and displays its question and options', async () => {
    let resolvePoll
    apiMock.getPoll.mockReturnValue(
      new Promise((resolve) => {
        resolvePoll = resolve
      }),
    )

    const { wrapper } = await mountVoteView('ROUTE42')

    expect(wrapper.get('[role="status"]').text()).toContain('Loading poll…')
    expect(apiMock.getPoll).toHaveBeenCalledExactlyOnceWith('ROUTE42')

    resolvePoll({ ...samplePoll, code: 'ROUTE42' })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Which day works best?')
    expect(wrapper.findAll('[data-test="vote-option"]').map((option) => option.element.value)).toEqual([
      '0',
      '1',
    ])
    expect(wrapper.text()).toContain('Monday')
    expect(wrapper.text()).toContain('Tuesday')
  })

  it('keeps no initial selection and enables submission when option zero is selected', async () => {
    const { wrapper } = await mountVoteView()
    await flushPromises()

    const submitButton = wrapper.get('[data-test="submit-vote"]')
    const firstOption = wrapper.findAll('[data-test="vote-option"]')[0]

    expect(wrapper.find('input[name="poll-answer"]:checked').exists()).toBe(false)
    expect(submitButton.attributes('disabled')).toBeDefined()

    await firstOption.setValue(true)

    expect(firstOption.element.checked).toBe(true)
    expect(submitButton.attributes('disabled')).toBeUndefined()
  })

  it('submits the selected index and persistent token, marks success, and opens results', async () => {
    const { router, wrapper } = await mountVoteView()
    await flushPromises()

    await wrapper.findAll('[data-test="vote-option"]')[0].setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(voterTokenMock.getVoterToken).toHaveBeenCalledOnce()
    expect(apiMock.submitVote).toHaveBeenCalledExactlyOnceWith(
      'ABC123',
      0,
      'persistent-voter-token',
    )
    expect(votedPollsMock.markVotedLocally).toHaveBeenCalledExactlyOnceWith('ABC123')
    expect(router.currentRoute.value.fullPath).toBe('/poll/ABC123/results')
  })

  it('prevents repeated submissions while the vote request is pending', async () => {
    let resolveVote
    apiMock.submitVote.mockReturnValue(
      new Promise((resolve) => {
        resolveVote = resolve
      }),
    )

    const { wrapper } = await mountVoteView()
    await flushPromises()

    await wrapper.findAll('[data-test="vote-option"]')[0].setValue(true)
    const form = wrapper.get('form')
    await form.trigger('submit')
    await form.trigger('submit')

    expect(apiMock.submitVote).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-test="submit-vote"]').attributes('disabled')).toBeDefined()

    resolveVote({ accepted: true })
    await flushPromises()
  })

  it('handles a backend duplicate-vote response and offers the results link', async () => {
    apiMock.submitVote.mockRejectedValue({
      status: 409,
      message: 'This voter token has already voted.',
    })

    const { wrapper } = await mountVoteView()
    await flushPromises()

    await wrapper.findAll('[data-test="vote-option"]')[1].setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(votedPollsMock.markVotedLocally).toHaveBeenCalledExactlyOnceWith('ABC123')
    expect(wrapper.text()).toContain('Your vote has already been recorded')
    expect(wrapper.text()).toContain('The server reports that this voter token has already voted')
    expect(wrapper.get('a[href="/poll/ABC123/results"]').text()).toBe('View results')
  })

  it('disables voting and links to results when the poll is closed', async () => {
    apiMock.getPoll.mockResolvedValue({ ...samplePoll, isClosed: true })

    const { wrapper } = await mountVoteView()
    await flushPromises()

    expect(wrapper.text()).toContain('Voting has closed')
    expect(wrapper.find('[data-test="vote-option"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="submit-vote"]').exists()).toBe(false)
    expect(wrapper.get('a[href="/poll/ABC123/results"]').text()).toBe('View results')
  })

  it('preserves the selection and offers retry after a network failure', async () => {
    apiMock.submitVote
      .mockRejectedValueOnce({ status: 0, message: 'The service could not be reached.' })
      .mockResolvedValueOnce({ accepted: true })

    const { wrapper } = await mountVoteView()
    await flushPromises()

    const secondOption = wrapper.findAll('[data-test="vote-option"]')[1]
    await secondOption.setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(secondOption.element.checked).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toContain('The service could not be reached.')

    const retryButton = wrapper.findAll('button').find((button) => button.text() === 'Retry vote')
    await retryButton.trigger('click')
    await flushPromises()

    expect(apiMock.submitVote).toHaveBeenCalledTimes(2)
    expect(apiMock.submitVote).toHaveBeenLastCalledWith(
      'ABC123',
      1,
      'persistent-voter-token',
    )
  })
})
