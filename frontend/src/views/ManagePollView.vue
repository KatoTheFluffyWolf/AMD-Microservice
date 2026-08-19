<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { invalidateAuthentication } from '@/auth/auth'
import BaseButton from '@/components/BaseButton.vue'
import CopyLinkButton from '@/components/CopyLinkButton.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PollStatusBadge from '@/components/PollStatusBadge.vue'
import ResultsChart from '@/components/ResultsChart.vue'
import { useLivePollResults } from '@/composables/useLivePollResults'
import { closePoll, getPoll } from '@/services/api'

const route = useRoute()
const router = useRouter()

const code = computed(() => String(route.params.code ?? '').trim())
const poll = ref(null)
const isPollLoading = ref(true)
const pollError = ref(null)
const isClosedOverride = ref(false)
const isCloseDialogOpen = ref(false)
const isClosing = ref(false)
const closeError = ref('')
const dialogError = ref('')
const closeNotice = ref('')
const requiresLogin = ref(false)
const isStartingLogin = ref(false)
const dialogElement = ref(null)
const statusFocusTarget = ref(null)
let dialogTrigger = null

const {
  results,
  isLoading: areResultsLoading,
  error: resultsError,
  connectionStatus,
  refresh,
} = useLivePollResults(code)

const isClosed = computed(
  () => isClosedOverride.value || poll.value?.isClosed || results.value?.isClosed || false,
)

const displayedQuestion = computed(() => poll.value?.question || results.value?.question || '')
const displayedOptions = computed(() => {
  if (results.value?.options?.length) return results.value.options

  return (poll.value?.options ?? []).map((option) => ({
    ...option,
    votes: 0,
    percentage: 0,
  }))
})
const totalVotes = computed(() => Number(results.value?.totalVotes ?? 0))
const isInitialLoading = computed(
  () => isPollLoading.value || (areResultsLoading.value && !results.value),
)
const notFound = computed(
  () => pollError.value?.status === 404 || (!poll.value && resultsError.value?.status === 404),
)
const fatalPollError = computed(() => !poll.value && pollError.value && !notFound.value)
const isLive = computed(() => connectionStatus.value === 'connected')

function absoluteRouteUrl(location) {
  const href = router.resolve(location).href
  if (typeof window === 'undefined') return href
  return new URL(href, window.location.origin).href
}

const votingUrl = computed(() =>
  absoluteRouteUrl({
    name: 'vote',
    params: { code: code.value },
  }),
)

const publicResultsUrl = computed(() =>
  absoluteRouteUrl({
    name: 'poll-results',
    params: { code: code.value },
  }),
)

function normalizedError(error, fallback) {
  return {
    status: Number.isFinite(error?.status) ? error.status : 0,
    message:
      typeof error?.message === 'string' && error.message.trim() ? error.message.trim() : fallback,
  }
}

async function loadPoll() {
  isPollLoading.value = true
  pollError.value = null

  try {
    poll.value = await getPoll(code.value)
  } catch (error) {
    poll.value = null
    pollError.value = normalizedError(
      error,
      'The poll could not be loaded. Check your connection and try again.',
    )
  } finally {
    isPollLoading.value = false
  }
}

function refreshPageData() {
  void loadPoll()
  void refresh()
}

function focusDialogControl() {
  dialogElement.value?.querySelector('[data-dialog-initial-focus]')?.focus()
}

function openCloseDialog(event) {
  if (isClosed.value || isClosing.value) return

  dialogTrigger = event?.currentTarget ?? document.activeElement
  dialogError.value = ''
  closeError.value = ''
  requiresLogin.value = false
  isCloseDialogOpen.value = true
  void nextTick(focusDialogControl)
}

function finishCloseDialog({ focusStatus = false } = {}) {
  isCloseDialogOpen.value = false
  dialogError.value = ''

  void nextTick(() => {
    if (focusStatus) {
      statusFocusTarget.value?.focus()
    } else {
      dialogTrigger?.focus?.()
    }
    dialogTrigger = null
  })
}

function cancelCloseDialog() {
  if (isClosing.value) return
  finishCloseDialog()
}

function trapDialogFocus(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    cancelCloseDialog()
    return
  }

  if (event.key !== 'Tab') return

  const focusable = [
    ...(dialogElement.value?.querySelectorAll(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ) ?? []),
  ]

  if (!focusable.length) return

  const first = focusable[0]
  const last = focusable.at(-1)

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function applyClosedState(closedPoll = {}) {
  isClosedOverride.value = true
  poll.value = {
    ...poll.value,
    ...closedPoll,
    code: closedPoll.code || poll.value?.code || code.value,
    question: closedPoll.question || poll.value?.question || results.value?.question || '',
    options: closedPoll.options?.length ? closedPoll.options : (poll.value?.options ?? []),
    isClosed: true,
  }

  if (results.value) {
    results.value = { ...results.value, isClosed: true }
  }
}

async function confirmClosePoll() {
  if (isClosing.value || isClosed.value) return

  isClosing.value = true
  dialogError.value = ''
  closeError.value = ''
  closeNotice.value = ''
  requiresLogin.value = false

  try {
    const closedPoll = await closePoll(code.value)
    applyClosedState(closedPoll)
    closeNotice.value = 'Poll closed. Existing votes and results have been preserved.'
    finishCloseDialog({ focusStatus: true })
  } catch (error) {
    const status = Number(error?.status ?? 0)

    if (status === 401) {
      invalidateAuthentication()
      closeError.value = 'Your session has expired. Sign in again to manage this poll.'
      requiresLogin.value = true
      finishCloseDialog()
    } else if (status === 403) {
      closeError.value = 'You do not own this poll, so you cannot close it.'
      finishCloseDialog()
    } else if (status === 404) {
      pollError.value = { status: 404, message: 'The requested poll could not be found.' }
      finishCloseDialog()
    } else if (status === 409 || status === 410) {
      applyClosedState()
      closeNotice.value = 'This poll was already closed. Existing results remain available.'
      finishCloseDialog({ focusStatus: true })
    } else {
      dialogError.value =
        typeof error?.message === 'string' && error.message.trim()
          ? error.message.trim()
          : 'The poll could not be closed. Please try again.'
    }
  } finally {
    isClosing.value = false
  }
}

async function startLogin() {
  if (isStartingLogin.value) return
  isStartingLogin.value = true

  try {
    await router.push({
      name: 'login',
      query: { redirect: route.fullPath },
    })
  } catch (error) {
    closeError.value =
      typeof error?.message === 'string' && error.message.trim()
        ? error.message.trim()
        : 'Sign-in could not be started. Please try again.'
  } finally {
    isStartingLogin.value = false
  }
}

onMounted(loadPoll)
</script>

<template>
  <section class="page-section page-container manage-page" aria-labelledby="manage-title">
    <div class="manage-heading">
      <div>
        <p class="eyebrow">Creator controls</p>
        <h1 id="manage-title">Manage poll</h1>
        <p class="lead">Share your poll, monitor responses and control whether voting is open.</p>
      </div>
      <span class="poll-code"
        >Code <strong>{{ code }}</strong></span
      >
    </div>

    <LoadingState v-if="isInitialLoading" message="Loading creator controls…" />

    <div v-else-if="notFound" class="surface-card state-card">
      <p class="eyebrow">Poll unavailable</p>
      <h2>This poll does not exist</h2>
      <p>Check the poll code or return home to create a new poll.</p>
      <BaseButton to="/" variant="secondary">Return home</BaseButton>
    </div>

    <div v-else-if="fatalPollError" class="surface-card state-card">
      <h2>We could not load this poll</h2>
      <ErrorAlert :message="pollError.message" retryable @retry="refreshPageData" />
    </div>

    <template v-else-if="poll">
      <ErrorAlert
        v-if="resultsError"
        class="page-alert"
        :message="resultsError.message"
        retryable
        @retry="refresh"
      />

      <ErrorAlert v-if="closeError" class="page-alert" :message="closeError" />

      <div v-if="requiresLogin" class="login-action">
        <BaseButton :loading="isStartingLogin" loading-text="Starting sign-in…" @click="startLogin">
          Sign in again
        </BaseButton>
      </div>

      <p
        v-if="closeNotice"
        ref="statusFocusTarget"
        class="success-notice"
        role="status"
        tabindex="-1"
      >
        {{ closeNotice }}
      </p>

      <div class="manage-grid">
        <div class="main-column">
          <article class="surface-card manage-card overview-card">
            <div class="card-title-row">
              <div>
                <span class="card-kicker">Overview</span>
                <h2>{{ displayedQuestion }}</h2>
              </div>
              <div class="status-stack">
                <PollStatusBadge :is-closed="isClosed" />
                <span v-if="isLive" class="live-label">
                  <i aria-hidden="true"></i>
                  Live
                </span>
              </div>
            </div>

            <dl class="stats-grid">
              <div>
                <dt>Total votes</dt>
                <dd data-test="total-votes">{{ totalVotes }}</dd>
              </div>
              <div>
                <dt>Options</dt>
                <dd>{{ displayedOptions.length }}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{{ isClosed ? 'Closed' : 'Open' }}</dd>
              </div>
            </dl>

            <ResultsChart :options="displayedOptions" :total-votes="totalVotes" />
          </article>

          <article class="surface-card manage-card share-card">
            <span class="card-kicker">Public links</span>
            <h2>Share this poll</h2>

            <div class="share-link">
              <div>
                <h3>Voting URL</h3>
                <a :href="votingUrl">{{ votingUrl }}</a>
              </div>
              <CopyLinkButton
                :value="votingUrl"
                label="Copy voting URL"
                success-message="Voting URL copied"
              />
            </div>

            <div class="share-link">
              <div>
                <h3>Public results URL</h3>
                <a :href="publicResultsUrl">{{ publicResultsUrl }}</a>
              </div>
              <CopyLinkButton
                :value="publicResultsUrl"
                label="Copy results URL"
                success-message="Results URL copied"
              />
            </div>
          </article>
        </div>

        <aside class="surface-card manage-card actions-card">
          <span class="card-kicker">Poll actions</span>
          <h2>{{ isClosed ? 'Voting is closed' : 'Close voting' }}</h2>

          <template v-if="isClosed">
            <p>New votes are disabled. Existing votes and public results remain available.</p>
            <BaseButton :to="{ name: 'poll-results', params: { code } }" variant="secondary">
              View public results
            </BaseButton>
          </template>

          <template v-else>
            <p>
              Closing the poll stops new votes. It does not delete any votes or results already
              recorded.
            </p>
            <BaseButton
              data-test="open-close-dialog"
              class="close-button"
              variant="danger"
              :disabled="isClosing"
              @click="openCloseDialog"
            >
              Close poll
            </BaseButton>
          </template>

          <p class="authorization-note">
            The API verifies creator ownership. Hiding this control is not an authorization check.
          </p>
        </aside>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="isCloseDialogOpen" class="dialog-backdrop" @click.self="cancelCloseDialog">
        <div
          ref="dialogElement"
          class="confirmation-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-dialog-title"
          aria-describedby="close-dialog-description"
          @keydown="trapDialogFocus"
        >
          <p class="dialog-kicker">Confirm action</p>
          <h2 id="close-dialog-title">Close this poll?</h2>
          <p id="close-dialog-description">
            New votes will be blocked immediately. Existing votes and results will not be deleted.
          </p>

          <ErrorAlert v-if="dialogError" :message="dialogError" />

          <div class="dialog-actions">
            <BaseButton
              data-dialog-initial-focus
              data-test="cancel-close"
              variant="secondary"
              :disabled="isClosing"
              @click="cancelCloseDialog"
            >
              Keep poll open
            </BaseButton>
            <BaseButton
              data-test="confirm-close"
              variant="danger"
              :loading="isClosing"
              loading-text="Closing poll…"
              @click="confirmClosePoll"
            >
              Yes, close poll
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.manage-page {
  min-height: 42rem;
}

.manage-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

h1 {
  margin-bottom: var(--space-3);
  font-size: clamp(2.2rem, 6vw, 3.7rem);
}

.lead {
  margin: 0;
}

.poll-code {
  flex: 0 0 auto;
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  color: var(--color-text-muted);
  background: var(--color-surface);
  font-size: 0.85rem;
}

.poll-code strong {
  margin-left: var(--space-1);
  color: var(--color-text);
}

.state-card {
  display: grid;
  max-width: 45rem;
  justify-items: start;
  gap: var(--space-3);
  margin-inline: auto;
  padding: clamp(1.25rem, 4vw, 2rem);
}

.state-card h2,
.state-card p {
  margin: 0;
}

.page-alert {
  margin-bottom: var(--space-4);
}

.login-action {
  margin: calc(var(--space-3) * -1) 0 var(--space-5);
}

.success-notice {
  margin: 0 0 var(--space-5);
  padding: var(--space-4);
  border: 1px solid #a8dfd1;
  border-radius: var(--radius-md);
  color: #08624f;
  background: var(--color-accent-soft);
  font-weight: 700;
}

.manage-grid {
  display: grid;
  align-items: start;
  gap: var(--space-5);
  grid-template-columns: minmax(0, 1.65fr) minmax(17rem, 0.65fr);
}

.main-column {
  display: grid;
  min-width: 0;
  gap: var(--space-5);
}

.manage-card {
  min-width: 0;
  padding: clamp(1.25rem, 4vw, 2rem);
}

.card-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.card-kicker,
.dialog-kicker {
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.manage-card h2 {
  margin: var(--space-2) 0 var(--space-5);
  font-size: 1.35rem;
  overflow-wrap: anywhere;
}

.status-stack {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  gap: var(--space-2);
}

.live-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #08765f;
  font-size: 0.76rem;
  font-weight: 800;
}

.live-label i {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: currentcolor;
  box-shadow: 0 0 0 4px rgb(25 169 135 / 0.13);
}

.stats-grid {
  display: grid;
  gap: 1px;
  margin: 0 0 var(--space-6);
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-border);
  grid-template-columns: repeat(3, 1fr);
}

.stats-grid div {
  padding: var(--space-4);
  background: var(--color-surface-muted);
}

dt {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-weight: 750;
  text-transform: uppercase;
}

dd {
  margin: var(--space-1) 0 0;
  font-size: 1.35rem;
  font-weight: 850;
}

.share-card h2 {
  margin-bottom: var(--space-4);
}

.share-link {
  display: grid;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) 0;
  border-top: 1px solid var(--color-border);
  grid-template-columns: minmax(0, 1fr) auto;
}

.share-link h3 {
  margin-bottom: var(--space-1);
  font-size: 0.92rem;
}

.share-link a {
  display: block;
  overflow: hidden;
  font-size: 0.86rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions-card {
  position: sticky;
  top: 6rem;
}

.actions-card > p {
  color: var(--color-text-muted);
}

.close-button {
  width: 100%;
}

.authorization-note {
  margin: var(--space-5) 0 0;
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  font-size: 0.78rem;
}

.dialog-backdrop {
  position: fixed;
  z-index: 100;
  display: grid;
  padding: var(--space-4);
  background: rgb(23 32 51 / 0.58);
  inset: 0;
  place-items: center;
}

.confirmation-dialog {
  width: min(31rem, 100%);
  padding: clamp(1.25rem, 5vw, 2rem);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.confirmation-dialog h2 {
  margin: var(--space-2) 0 var(--space-3);
  font-size: 1.55rem;
}

.confirmation-dialog > p:not(.dialog-kicker) {
  color: var(--color-text-muted);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

@media (max-width: 53rem) {
  .manage-grid {
    grid-template-columns: 1fr;
  }

  .actions-card {
    position: static;
  }
}

@media (max-width: 42rem) {
  .manage-heading,
  .card-title-row,
  .share-link {
    align-items: stretch;
    grid-template-columns: 1fr;
  }

  .manage-heading,
  .card-title-row {
    flex-direction: column;
  }

  .manage-heading {
    align-items: flex-start;
  }

  .status-stack {
    justify-items: start;
  }
}

@media (max-width: 31rem) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .dialog-actions {
    flex-direction: column-reverse;
  }

  .dialog-actions :deep(.base-button),
  .share-link :deep(.copy-control),
  .share-link :deep(.base-button) {
    width: 100%;
  }
}
</style>
