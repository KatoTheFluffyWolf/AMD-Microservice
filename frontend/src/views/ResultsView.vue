<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BaseButton from '@/components/BaseButton.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PollStatusBadge from '@/components/PollStatusBadge.vue'
import ResultsChart from '@/components/ResultsChart.vue'
import { useLivePollResults } from '@/composables/useLivePollResults'

const route = useRoute()
const code = computed(() => String(route.params.code ?? '').trim())

const {
  results,
  isLoading,
  isRefreshing,
  error,
  connectionStatus,
  connectionError,
  refresh,
} = useLivePollResults(code)

const notFound = computed(() => !results.value && error.value?.status === 404)
const hasFatalError = computed(() => !results.value && error.value && !notFound.value)
const isConnected = computed(() => connectionStatus.value === 'connected')
const isDisconnected = computed(() => connectionStatus.value === 'disconnected')

const connectionLabel = computed(() => {
  const labels = {
    idle: 'Waiting',
    connecting: 'Connecting',
    connected: 'Live',
    reconnecting: 'Reconnecting',
    disconnected: 'Disconnected',
  }

  return labels[connectionStatus.value] ?? 'Unavailable'
})

const votingRoute = computed(() => ({
  name: 'vote',
  params: { code: code.value },
}))
</script>

<template>
  <section class="page-section page-container results-page" aria-labelledby="results-title">
    <div class="results-heading">
      <div>
        <p class="eyebrow">Live poll results</p>
        <h1 id="results-title">Results</h1>
      </div>

      <div class="connection-summary" role="status" aria-live="polite">
        <span
          class="connection-badge"
          :class="{
            'connection-badge--live': isConnected,
            'connection-badge--warning': connectionStatus === 'reconnecting',
          }"
        >
          <i aria-hidden="true"></i>
          {{ connectionLabel }}
        </span>
        <span>Poll {{ code }}</span>
      </div>
    </div>

    <article class="surface-card results-card">
      <LoadingState v-if="isLoading && !results" message="Loading results…" />

      <div v-else-if="notFound" class="state-content">
        <p class="eyebrow">Poll unavailable</p>
        <h2>This poll does not exist</h2>
        <p>Check the poll code or ask the creator for the correct results link.</p>
        <BaseButton to="/" variant="secondary">Return home</BaseButton>
      </div>

      <div v-else-if="hasFatalError" class="state-content">
        <h2>We could not load these results</h2>
        <ErrorAlert :message="error.message" retryable @retry="refresh" />
      </div>

      <template v-else-if="results">
        <div class="poll-summary">
          <div>
            <div class="summary-kicker">
              <PollStatusBadge :is-closed="results.isClosed" />
              <span v-if="isConnected" class="live-indicator">
                <i aria-hidden="true"></i>
                Updating live
              </span>
            </div>
            <h2>{{ results.question }}</h2>
          </div>

          <div class="total-votes" aria-live="polite" aria-atomic="true">
            <strong data-test="total-votes">{{ results.totalVotes }}</strong>
            <span>{{ results.totalVotes === 1 ? 'total vote' : 'total votes' }}</span>
          </div>
        </div>

        <ErrorAlert
          v-if="error"
          class="refresh-error"
          :message="error.message"
          retryable
          @retry="refresh"
        />

        <ResultsChart :options="results.options" :total-votes="results.totalVotes" />

        <div v-if="isDisconnected" class="connection-warning">
          <div>
            <strong>Live updates are disconnected.</strong>
            <span>{{ connectionError || 'Refresh manually to retrieve the latest totals.' }}</span>
          </div>
          <BaseButton
            variant="secondary"
            :loading="isRefreshing"
            loading-text="Refreshing…"
            @click="refresh"
          >
            Refresh
          </BaseButton>
        </div>

        <div class="results-actions">
          <BaseButton :to="votingRoute" variant="secondary">Back to voting page</BaseButton>
        </div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.results-page {
  min-height: 40rem;
}

.results-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

h1 {
  margin: 0;
  font-size: clamp(2.2rem, 6vw, 3.7rem);
}

.connection-summary {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-muted);
  font-size: 0.86rem;
  font-weight: 700;
}

.connection-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  color: var(--color-text-muted);
  background: var(--color-surface);
}

.connection-badge i,
.live-indicator i {
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 50%;
  background: currentcolor;
}

.connection-badge--live {
  color: #08765f;
  border-color: #a8dfd1;
  background: var(--color-accent-soft);
}

.connection-badge--warning {
  color: #87630d;
  border-color: #ead79d;
  background: #fff9e7;
}

.results-card {
  padding: clamp(1.25rem, 4vw, 2rem);
}

.state-content {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  padding: var(--space-4);
}

.state-content h2,
.state-content p {
  margin: 0;
}

.state-content :deep(.error-alert) {
  width: 100%;
}

.poll-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-5);
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.summary-kicker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.poll-summary h2 {
  max-width: 45rem;
  margin: 0;
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  overflow-wrap: anywhere;
}

.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #08765f;
  font-size: 0.8rem;
  font-weight: 800;
}

.live-indicator i {
  box-shadow: 0 0 0 4px rgb(25 169 135 / 0.13);
}

.total-votes {
  display: grid;
  min-width: 8rem;
  justify-items: end;
  color: var(--color-text-muted);
}

.total-votes strong {
  color: var(--color-primary-dark);
  font-size: clamp(2rem, 6vw, 3.2rem);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.total-votes span {
  margin-top: var(--space-2);
  font-size: 0.82rem;
  font-weight: 750;
  text-transform: uppercase;
}

.refresh-error {
  margin-bottom: var(--space-5);
}

.connection-warning {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-top: var(--space-6);
  padding: var(--space-4);
  border: 1px solid #ead79d;
  border-radius: var(--radius-md);
  color: #6f570f;
  background: #fff9e7;
}

.connection-warning div {
  display: grid;
  gap: var(--space-1);
}

.connection-warning span {
  font-size: 0.88rem;
}

.results-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-6);
  padding-top: var(--space-5);
  border-top: 1px solid var(--color-border);
}

@media (max-width: 42rem) {
  .results-heading,
  .poll-summary,
  .connection-warning {
    align-items: stretch;
    flex-direction: column;
  }

  .results-heading {
    align-items: flex-start;
  }

  .total-votes {
    justify-items: start;
  }
}

@media (max-width: 31rem) {
  .connection-summary {
    align-items: flex-start;
    flex-direction: column;
  }

  .connection-warning :deep(.base-button),
  .results-actions :deep(.base-button) {
    width: 100%;
  }
}
</style>
