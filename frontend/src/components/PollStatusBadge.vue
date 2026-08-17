<script setup>
import { computed } from 'vue'

const props = defineProps({
  isClosed: {
    type: Boolean,
    default: false,
  },
})

const statusText = computed(() => (props.isClosed ? 'Closed' : 'Open'))
</script>

<template>
  <span
    class="poll-status"
    :class="isClosed ? 'poll-status--closed' : 'poll-status--open'"
    role="status"
    :aria-label="`Poll status: ${statusText}`"
  >
    <svg v-if="isClosed" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6.5 8V6.25a3.5 3.5 0 0 1 7 0V8m-8 0h9v7.5h-9V8Z" />
    </svg>
    <svg v-else viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="6" />
      <path d="m7.25 10 1.8 1.8 3.7-4" />
    </svg>
    {{ statusText }}
  </span>
</template>

<style scoped>
.poll-status {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  padding: 0.28rem 0.65rem;
  border: 1px solid currentcolor;
  border-radius: var(--radius-pill);
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.2;
}

.poll-status svg {
  width: 0.9rem;
  height: 0.9rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.poll-status--open {
  color: #08765f;
  background: var(--color-accent-soft);
}

.poll-status--closed {
  color: #5d6575;
  background: var(--color-surface-muted);
}
</style>