<script setup>
defineProps({
  message: {
    type: String,
    default: 'Loading…',
  },
})
</script>

<template>
  <div class="loading-state" role="status" aria-live="polite">
    <span class="loading-state__spinner" aria-hidden="true"></span>
    <span>{{ message }}</span>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex;
  min-height: 8rem;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-6);
  color: var(--color-text-muted);
  font-weight: 700;
  text-align: center;
}

.loading-state__spinner {
  width: 1.35rem;
  height: 1.35rem;
  border: 3px solid var(--color-primary-soft);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: loading-spin 800ms linear infinite;
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-state__spinner {
    animation-duration: 1.6s;
  }
}
</style>