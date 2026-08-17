<script setup>
import BaseButton from '@/components/BaseButton.vue'

defineProps({
  message: {
    type: String,
    required: true,
  },
  retryable: {
    type: Boolean,
    default: false,
  },
  retryLabel: {
    type: String,
    default: 'Try again',
  },
})

defineEmits(['retry'])
</script>

<template>
  <div class="error-alert" role="alert">
    <svg class="error-alert__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5 21 20H3L12 3.5Zm0 5.5v4.5m0 3h.01" />
    </svg>

    <div class="error-alert__content">
      <p>{{ message }}</p>
      <BaseButton v-if="retryable" variant="secondary" @click="$emit('retry')">
        {{ retryLabel }}
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.error-alert {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid #efb9c0;
  border-radius: var(--radius-md);
  color: #8f2634;
  background: #fff1f3;
}

.error-alert__icon {
  width: 1.35rem;
  min-width: 1.35rem;
  margin-top: 0.15rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.error-alert__content {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
}

.error-alert p {
  margin: 0;
  font-weight: 650;
}
</style>
