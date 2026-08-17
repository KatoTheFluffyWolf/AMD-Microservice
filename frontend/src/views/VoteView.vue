<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/BaseButton.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PollStatusBadge from '@/components/PollStatusBadge.vue'
import { getPoll, submitVote } from '@/services/api'
import { hasVotedLocally, markVotedLocally } from '@/services/votedPolls'
import { getVoterToken } from '@/services/voterToken'

const route = useRoute()
const router = useRouter()

const code = ref('')
const poll = ref(null)
const selectedOptionIndex = ref(null)
const isLoading = ref(true)
const isSubmitting = ref(false)
const notFound = ref(false)
const loadError = ref('')
const voteError = ref('')
const canRetryVote = ref(false)
const alreadyVoted = ref(false)
const duplicateVoteDetected = ref(false)

const resultsRoute = computed(() => ({
  name: 'poll-results',
  params: { code: code.value },
}))

const votingUnavailable = computed(
  () => !poll.value || poll.value.isClosed || alreadyVoted.value,
)

const submitDisabled = computed(
  () => votingUnavailable.value || selectedOptionIndex.value === null || isSubmitting.value,
)

function readableMessage(error, fallback) {
  return typeof error?.message === 'string' && error.message.trim()
    ? error.message.trim()
    : fallback
}

function validationMessage(error) {
  const validationErrors = error?.validationErrors
  if (!validationErrors || typeof validationErrors !== 'object') return ''

  for (const messages of Object.values(validationErrors)) {
    const values = Array.isArray(messages) ? messages : [messages]
    const message = values.find((value) => typeof value === 'string' && value.trim())
    if (message) return message.trim()
  }

  return ''
}

function isClosedPollError(error) {
  if (error?.status === 410) return true

  return /poll.+closed|voting.+closed|no longer accepts votes/i.test(
    typeof error?.message === 'string' ? error.message : '',
  )
}

async function loadPoll() {
  isLoading.value = true
  notFound.value = false
  loadError.value = ''

  try {
    poll.value = await getPoll(code.value)
  } catch (error) {
    poll.value = null

    if (error?.status === 404) {
      notFound.value = true
    } else {
      loadError.value = readableMessage(
        error,
        'The poll could not be loaded. Check your connection and try again.',
      )
    }
  } finally {
    isLoading.value = false
  }
}

function clearVoteError() {
  voteError.value = ''
  canRetryVote.value = false
}

async function handleSubmitVote() {
  if (isSubmitting.value || submitDisabled.value) return

  clearVoteError()
  isSubmitting.value = true

  try {
    const voterToken = getVoterToken()
    const receipt = await submitVote(code.value, selectedOptionIndex.value, voterToken)

    if (receipt?.accepted === false) {
      voteError.value = 'The server did not accept this vote. Please try again.'
      canRetryVote.value = true
      return
    }

    markVotedLocally(code.value)
    await router.push(resultsRoute.value)
  } catch (error) {
    if (isClosedPollError(error)) {
      poll.value = poll.value ? { ...poll.value, isClosed: true } : poll.value
      voteError.value = ''
      return
    }

    if (error?.status === 409) {
      markVotedLocally(code.value)
      alreadyVoted.value = true
      duplicateVoteDetected.value = true
      voteError.value = ''
      return
    }

    if (error?.status === 400) {
      voteError.value =
        validationMessage(error) ||
        readableMessage(error, 'The vote was not valid. Select an option and try again.')
      return
    }

    voteError.value = readableMessage(
      error,
      'The vote could not be submitted. Check your connection and try again.',
    )
    canRetryVote.value = error?.status === 0 || error?.status === undefined
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  code.value = String(route.params.code ?? '').trim()
  alreadyVoted.value = hasVotedLocally(code.value)
  loadPoll()
})
</script>

<template>
  <section class="page-section page-narrow vote-page" aria-labelledby="vote-title">
    <div class="poll-meta">
      <span>Poll {{ code }}</span>
      <PollStatusBadge v-if="poll" :is-closed="poll.isClosed" />
    </div>

    <article class="surface-card vote-card">
      <LoadingState v-if="isLoading" message="Loading poll…" />

      <div v-else-if="notFound" class="state-content">
        <p class="eyebrow">Poll unavailable</p>
        <h1 id="vote-title">This poll does not exist</h1>
        <p class="lead">Check the poll code or ask the creator for a new voting link.</p>
        <BaseButton to="/" variant="secondary">Return home</BaseButton>
      </div>

      <div v-else-if="loadError" class="state-content">
        <p class="eyebrow">Unable to load poll</p>
        <h1 id="vote-title">We could not open this poll</h1>
        <ErrorAlert :message="loadError" retryable @retry="loadPoll" />
      </div>

      <template v-else-if="poll">
        <p class="eyebrow">Cast your vote</p>
        <h1 id="vote-title">{{ poll.question }}</h1>
        <p class="lead">Choose one answer. Your selection is submitted only when you confirm it.</p>

        <div v-if="poll.isClosed" class="availability-notice" role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10V7.5a5 5 0 0 1 10 0V10m-11 0h12v10H6V10Z" />
          </svg>
          <div>
            <h2>Voting has closed</h2>
            <p>This poll no longer accepts votes, but its results are still available.</p>
            <BaseButton :to="resultsRoute" variant="secondary">View results</BaseButton>
          </div>
        </div>

        <div v-else-if="alreadyVoted" class="availability-notice" role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 2.6 2.6L16.5 9" />
          </svg>
          <div>
            <h2>Your vote has already been recorded</h2>
            <p v-if="duplicateVoteDetected">
              The server reports that this voter token has already voted in this poll.
            </p>
            <p v-else>
              This browser remembers submitting a vote. The server still enforces whether a voter
              token may vote.
            </p>
            <BaseButton :to="resultsRoute" variant="secondary">View results</BaseButton>
          </div>
        </div>

        <form v-else class="vote-form" @submit.prevent="handleSubmitVote">
          <fieldset :disabled="isSubmitting">
            <legend>Select one answer</legend>
            <label
              v-for="option in poll.options"
              :key="option.index"
              class="vote-option"
              :class="{ 'vote-option--selected': selectedOptionIndex === option.index }"
            >
              <input
                v-model="selectedOptionIndex"
                data-test="vote-option"
                type="radio"
                name="poll-answer"
                :value="option.index"
                @change="clearVoteError"
              />
              <span>{{ option.text }}</span>
            </label>
          </fieldset>

          <ErrorAlert
            v-if="voteError"
            :message="voteError"
            :retryable="canRetryVote"
            retry-label="Retry vote"
            @retry="handleSubmitVote"
          />

          <BaseButton
            data-test="submit-vote"
            class="submit-vote"
            type="submit"
            :disabled="submitDisabled"
            :loading="isSubmitting"
            loading-text="Submitting vote…"
          >
            Submit vote
          </BaseButton>
        </form>
      </template>
    </article>
  </section>
</template>

<style scoped>
.vote-page {
  min-height: 38rem;
}

.poll-meta {
  display: flex;
  min-height: 2rem;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  color: var(--color-text-muted);
  font-size: 0.88rem;
  font-weight: 750;
}

.vote-card {
  padding: clamp(1.5rem, 5vw, 2.75rem);
}

h1 {
  margin-bottom: var(--space-4);
  font-size: clamp(2rem, 6vw, 3.2rem);
  overflow-wrap: anywhere;
}

.lead {
  margin-bottom: var(--space-6);
}

.state-content {
  display: grid;
  justify-items: start;
}

.state-content :deep(.error-alert) {
  width: 100%;
}

.availability-notice {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: clamp(1rem, 4vw, 1.5rem);
  border: 1px solid #d9d3ff;
  border-radius: var(--radius-md);
  color: #4f477a;
  background: var(--color-primary-soft);
}

.availability-notice > svg {
  width: 1.7rem;
  min-width: 1.7rem;
  margin-top: 0.15rem;
  fill: none;
  stroke: var(--color-primary-dark);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.availability-notice h2 {
  margin-bottom: var(--space-2);
  font-size: 1.2rem;
}

.availability-notice p {
  margin-bottom: var(--space-4);
}

.vote-form {
  display: grid;
  gap: var(--space-5);
}

fieldset {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  margin-bottom: var(--space-3);
  font-weight: 800;
}

.vote-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  color: var(--color-text);
  background: var(--color-surface);
  font-weight: 650;
  cursor: pointer;
  transition:
    border-color var(--transition),
    box-shadow var(--transition),
    background-color var(--transition);
}

.vote-option:hover {
  border-color: var(--color-primary);
  background: #faf9ff;
}

.vote-option:focus-within {
  border-color: var(--color-primary);
  outline: 3px solid #ffb547;
  outline-offset: 2px;
}

.vote-option--selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.vote-option input {
  width: 1.15rem;
  height: 1.15rem;
  flex: 0 0 auto;
  margin: 0;
  accent-color: var(--color-primary);
}

fieldset:disabled .vote-option {
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  cursor: wait;
}

.submit-vote {
  width: 100%;
}

@media (max-width: 31rem) {
  .vote-card {
    padding: var(--space-5);
  }

  .availability-notice {
    flex-direction: column;
  }

  .availability-notice :deep(.base-button) {
    width: 100%;
  }
}
</style>
