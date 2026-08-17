<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps({
  value: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: 'Copy link',
  },
  successMessage: {
    type: String,
    default: 'Copied',
  },
  failureMessage: {
    type: String,
    default: 'Could not copy',
  },
})

const emit = defineEmits(['copied', 'failed'])
const copyState = ref('idle')
let feedbackTimer

const feedback = computed(() => {
  if (copyState.value === 'success') return props.successMessage
  if (copyState.value === 'failed') return props.failureMessage
  return ''
})

function resetFeedbackLater() {
  window.clearTimeout(feedbackTimer)
  feedbackTimer = window.setTimeout(() => {
    copyState.value = 'idle'
  }, 2_500)
}

async function copyLink() {
  if (copyState.value === 'copying') return
  copyState.value = 'copying'

  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      throw new Error('Clipboard access is unavailable.')
    }

    await navigator.clipboard.writeText(props.value)
    copyState.value = 'success'
    emit('copied')
  } catch {
    copyState.value = 'failed'
    emit('failed')
  }

  resetFeedbackLater()
}

onBeforeUnmount(() => {
  window.clearTimeout(feedbackTimer)
})
</script>

<template>
  <span class="copy-control">
    <BaseButton
      variant="secondary"
      :loading="copyState === 'copying'"
      loading-text="Copying…"
      @click="copyLink"
    >
      <template #icon>
        <svg class="copy-control__icon" viewBox="0 0 20 20" aria-hidden="true">
          <rect x="6.5" y="6.5" width="9" height="9" rx="1.5" />
          <path d="M13.5 6.5V5A1.5 1.5 0 0 0 12 3.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5" />
        </svg>
      </template>
      {{ label }}
    </BaseButton>

    <span class="copy-control__feedback" role="status" aria-live="polite">
      {{ feedback }}
    </span>
  </span>
</template>

<style scoped>
.copy-control {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
}

.copy-control__icon {
  width: 1.1rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.copy-control__feedback {
  min-width: 5.5rem;
  color: var(--color-text-muted);
  font-size: 0.86rem;
  font-weight: 700;
}

@media (max-width: 26rem) {
  .copy-control {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--space-2);
  }
}
</style>