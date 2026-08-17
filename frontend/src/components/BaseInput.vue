<script setup>
import { computed, useId } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  id: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: 'text',
  },
  name: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  autocomplete: {
    type: String,
    default: undefined,
  },
  helpText: {
    type: String,
    default: '',
  },
  errorMessage: {
    type: String,
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'blur'])

const generatedId = `base-input-${useId()}`
const inputId = computed(() => props.id || generatedId)
const helpId = computed(() => `${inputId.value}-help`)
const errorId = computed(() => `${inputId.value}-error`)
const describedBy = computed(() =>
  [props.helpText ? helpId.value : '', props.errorMessage ? errorId.value : '']
    .filter(Boolean)
    .join(' '),
)
</script>

<template>
  <div class="input-field" :class="{ 'input-field--invalid': errorMessage }">
    <label class="input-field__label" :for="inputId">
      {{ label }}
      <span v-if="required" class="input-field__required" aria-hidden="true">*</span>
      <span v-if="required" class="visually-hidden">(required)</span>
    </label>

    <input
      v-bind="$attrs"
      :id="inputId"
      class="input-field__control"
      :value="modelValue"
      :type="type"
      :name="name || undefined"
      :placeholder="placeholder || undefined"
      :autocomplete="autocomplete"
      :required="required"
      :disabled="disabled"
      :aria-invalid="errorMessage ? 'true' : undefined"
      :aria-describedby="describedBy || undefined"
      @input="emit('update:modelValue', $event.target.value)"
      @blur="emit('blur', $event)"
    />

    <p v-if="helpText" :id="helpId" class="input-field__help">{{ helpText }}</p>
    <p v-if="errorMessage" :id="errorId" class="input-field__error" role="alert">
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm0 4v4m0 3h.01" />
      </svg>
      {{ errorMessage }}
    </p>
  </div>
</template>

<style scoped>
.input-field {
  display: grid;
  gap: var(--space-2);
}

.input-field__label {
  color: var(--color-text);
  font-size: 0.94rem;
  font-weight: 750;
}

.input-field__required {
  color: var(--color-danger);
}

.input-field__control {
  width: 100%;
  min-height: 3rem;
  padding: 0.72rem 0.85rem;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  color: var(--color-text);
  background: var(--color-surface);
  transition:
    border-color var(--transition),
    box-shadow var(--transition),
    background-color var(--transition);
}

.input-field__control::placeholder {
  color: #8b93a5;
}

.input-field__control:hover:not(:disabled) {
  border-color: #9ca6ba;
}

.input-field__control:focus-visible {
  border-color: var(--color-primary);
  outline: 3px solid #ffb547;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--color-primary-soft);
}

.input-field__control:disabled {
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  cursor: not-allowed;
}

.input-field--invalid .input-field__control {
  border-color: var(--color-danger);
}

.input-field__help,
.input-field__error {
  margin: 0;
  font-size: 0.86rem;
}

.input-field__help {
  color: var(--color-text-muted);
}

.input-field__error {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--color-danger);
  font-weight: 650;
}

.input-field__error svg {
  width: 1rem;
  min-width: 1rem;
  margin-top: 0.18rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-width: 1.8;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
</style>