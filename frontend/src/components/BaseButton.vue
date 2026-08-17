<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  to: {
    type: [String, Object],
    default: null,
  },
  type: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'submit', 'reset'].includes(value),
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'danger'].includes(value),
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadingText: {
    type: String,
    default: 'Please wait',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['click'])

const isDisabled = computed(() => props.disabled || props.loading)
const buttonClasses = computed(() => [
  'base-button',
  `base-button--${props.variant}`,
  { 'base-button--disabled': isDisabled.value },
])

function handleButtonClick(event) {
  if (isDisabled.value) return
  emit('click', event)
}

function handleLinkClick(event, navigate) {
  if (isDisabled.value) {
    event.preventDefault()
    return
  }

  emit('click', event)
  navigate(event)
}
</script>

<template>
  <RouterLink v-if="to" v-slot="{ href, navigate }" :to="to" custom>
    <a
      v-bind="$attrs"
      :href="href"
      :class="buttonClasses"
      :aria-disabled="isDisabled || undefined"
      :aria-busy="loading || undefined"
      @click="handleLinkClick($event, navigate)"
    >
      <span v-if="loading" class="base-button__spinner" aria-hidden="true"></span>
      <slot v-else name="icon"></slot>
      <span><slot v-if="!loading"></slot><template v-else>{{ loadingText }}</template></span>
    </a>
  </RouterLink>

  <button
    v-else
    v-bind="$attrs"
    :type="type"
    :class="buttonClasses"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
    @click="handleButtonClick"
  >
    <span v-if="loading" class="base-button__spinner" aria-hidden="true"></span>
    <slot v-else name="icon"></slot>
    <span><slot v-if="!loading"></slot><template v-else>{{ loadingText }}</template></span>
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  min-height: 2.85rem;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: 0.7rem 1.15rem;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-weight: 750;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  transition:
    transform var(--transition),
    background-color var(--transition),
    border-color var(--transition),
    box-shadow var(--transition);
}

.base-button:hover:not(.base-button--disabled) {
  transform: translateY(-1px);
}

.base-button--primary {
  color: #ffffff;
  background: var(--color-primary);
  box-shadow: 0 8px 20px rgb(91 71 224 / 0.24);
}

.base-button--primary:hover:not(.base-button--disabled) {
  color: #ffffff;
  background: var(--color-primary-dark);
  box-shadow: 0 10px 24px rgb(91 71 224 / 0.3);
}

.base-button--secondary {
  color: var(--color-text);
  border-color: var(--color-border-strong);
  background: var(--color-surface);
}

.base-button--secondary:hover:not(.base-button--disabled) {
  color: var(--color-primary-dark);
  border-color: var(--color-primary);
}

.base-button--danger {
  color: #ffffff;
  background: var(--color-danger);
  box-shadow: 0 8px 20px rgb(196 69 83 / 0.2);
}

.base-button--danger:hover:not(.base-button--disabled) {
  color: #ffffff;
  background: #a93443;
  box-shadow: 0 10px 24px rgb(196 69 83 / 0.27);
}

.base-button--disabled {
  color: #8b93a5;
  border-color: var(--color-border);
  background: var(--color-surface-muted);
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}

.base-button__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid currentcolor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: button-spin 700ms linear infinite;
}

@keyframes button-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-button__spinner {
    animation-duration: 1.4s;
  }
}
</style>