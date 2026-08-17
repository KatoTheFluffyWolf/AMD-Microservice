<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import { createPoll } from '@/services/api'

const MIN_OPTIONS = 2
const MAX_OPTIONS = 6
const MIN_QUESTION_LENGTH = 5
const MAX_QUESTION_LENGTH = 300
const MAX_OPTION_LENGTH = 150

const router = useRouter()
const question = ref('')
const questionTouched = ref(false)
const options = ref([])
const touchedOptions = reactive({})
const backendOptionErrors = reactive({})
const backendQuestionError = ref('')
const backendOptionsError = ref('')
const submissionError = ref('')
const isSubmitting = ref(false)
const hasInteracted = ref(false)
const submittedSuccessfully = ref(false)

let nextOptionId = 1

function newOption() {
  return {
    id: `answer-${nextOptionId++}`,
    value: '',
  }
}

options.value = [newOption(), newOption()]

const trimmedQuestion = computed(() => question.value.trim())
const trimmedOptions = computed(() => options.value.map((option) => option.value.trim()))

const questionValidationError = computed(() => {
  const length = trimmedQuestion.value.length

  if (length < MIN_QUESTION_LENGTH) {
    return `Question must contain at least ${MIN_QUESTION_LENGTH} characters.`
  }

  if (length > MAX_QUESTION_LENGTH) {
    return `Question must contain no more than ${MAX_QUESTION_LENGTH} characters.`
  }

  return ''
})

const duplicateOptionIds = computed(() => {
  const idsByValue = new Map()

  options.value.forEach((option) => {
    const normalizedValue = option.value.trim().toLocaleLowerCase()
    if (!normalizedValue) return

    const matchingIds = idsByValue.get(normalizedValue) ?? []
    matchingIds.push(option.id)
    idsByValue.set(normalizedValue, matchingIds)
  })

  return new Set(
    [...idsByValue.values()].filter((matchingIds) => matchingIds.length > 1).flat(),
  )
})

function localOptionError(option) {
  const value = option.value.trim()

  if (!value) return 'Answer option cannot be blank.'
  if (value.length > MAX_OPTION_LENGTH) {
    return `Answer option must contain no more than ${MAX_OPTION_LENGTH} characters.`
  }
  if (duplicateOptionIds.value.has(option.id)) return 'Answer options must be different.'

  return ''
}

function displayedQuestionError() {
  if (backendQuestionError.value) return backendQuestionError.value
  return questionTouched.value ? questionValidationError.value : ''
}

function displayedOptionError(option) {
  if (backendOptionErrors[option.id]) return backendOptionErrors[option.id]
  return touchedOptions[option.id] ? localOptionError(option) : ''
}

const isFormValid = computed(
  () =>
    !questionValidationError.value &&
    options.value.length >= MIN_OPTIONS &&
    options.value.length <= MAX_OPTIONS &&
    options.value.every((option) => !localOptionError(option)),
)

const isSubmitDisabled = computed(() => !isFormValid.value || isSubmitting.value)
const shouldWarnBeforeLeaving = computed(
  () => hasInteracted.value && !submittedSuccessfully.value,
)

function markInteracted() {
  hasInteracted.value = true
}

function updateQuestion(value) {
  question.value = value
  backendQuestionError.value = ''
  submissionError.value = ''
  markInteracted()
}

function touchQuestion() {
  questionTouched.value = true
}

function updateOption(option, value) {
  option.value = value
  delete backendOptionErrors[option.id]
  backendOptionsError.value = ''
  submissionError.value = ''
  markInteracted()
}

function touchOption(option) {
  touchedOptions[option.id] = true
}

function addOption() {
  if (options.value.length >= MAX_OPTIONS || isSubmitting.value) return

  options.value.push(newOption())
  backendOptionsError.value = ''
  markInteracted()
}

function removeOption(optionId) {
  if (options.value.length <= MIN_OPTIONS || isSubmitting.value) return

  options.value = options.value.filter((option) => option.id !== optionId)
  delete touchedOptions[optionId]
  delete backendOptionErrors[optionId]
  backendOptionsError.value = ''
  markInteracted()
}

function touchAllFields() {
  questionTouched.value = true
  options.value.forEach((option) => {
    touchedOptions[option.id] = true
  })
}

function firstSafeMessage(messages) {
  const values = Array.isArray(messages) ? messages : [messages]
  return values.find((message) => typeof message === 'string' && message.trim())?.trim() ?? ''
}

function applyBackendValidation(validationErrors) {
  let matchedField = false

  Object.entries(validationErrors ?? {}).forEach(([field, messages]) => {
    const message = firstSafeMessage(messages)
    if (!message) return

    const normalizedField = field.replace(/^\$\.?/, '').toLocaleLowerCase()
    if (normalizedField === 'question' || normalizedField.endsWith('.question')) {
      backendQuestionError.value = message
      matchedField = true
      return
    }

    const optionIndexMatch = normalizedField.match(
      /(?:options|optiontexts|answeroptions)(?:\[(\d+)\]|\.(\d+))(?=\.|$)/,
    )
    if (optionIndexMatch) {
      const optionIndex = Number(optionIndexMatch[1] ?? optionIndexMatch[2])
      const option = options.value[optionIndex]
      if (option) {
        backendOptionErrors[option.id] = message
        matchedField = true
        return
      }
    }

    if (/(?:^|\.)(?:options|optiontexts|answeroptions)$/.test(normalizedField)) {
      backendOptionsError.value = message
      matchedField = true
    }
  })

  return matchedField
}

async function submitPoll() {
  if (isSubmitting.value) return

  touchAllFields()
  submissionError.value = ''
  backendQuestionError.value = ''
  backendOptionsError.value = ''
  Object.keys(backendOptionErrors).forEach((optionId) => delete backendOptionErrors[optionId])

  if (!isFormValid.value) return

  isSubmitting.value = true

  try {
    const createdPoll = await createPoll({
      question: trimmedQuestion.value,
      options: trimmedOptions.value,
    })
    const code = createdPoll?.code?.trim()

    if (!code) {
      throw new Error('The poll was created, but the server did not return its code.')
    }

    submittedSuccessfully.value = true
    await router.push({
      name: 'manage-poll',
      params: { code },
      state: { pollCreated: true },
    })
  } catch (error) {
    const hasFieldErrors = applyBackendValidation(error?.validationErrors)
    submissionError.value =
      error?.message ||
      (hasFieldErrors
        ? 'Some poll details need your attention.'
        : 'The poll could not be created. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

function handleBeforeUnload(event) {
  if (!shouldWarnBeforeLeaving.value) return

  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(() => {
  if (!shouldWarnBeforeLeaving.value) return true
  return window.confirm('Leave this page? Your unfinished poll will be lost.')
})

onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))
</script>

<template>
  <section class="page-section page-narrow" aria-labelledby="create-title">
    <p class="eyebrow">Creator workspace</p>
    <h1 id="create-title">Create a new poll</h1>
    <p class="lead">
      Ask one clear question and give voters between two and six answer choices.
    </p>

    <form class="surface-card poll-form" novalidate @submit.prevent="submitPoll">
      <ErrorAlert v-if="submissionError" :message="submissionError" />

      <div class="question-field" :class="{ 'question-field--invalid': displayedQuestionError() }">
        <label for="poll-question">
          Poll question <span class="required-marker" aria-hidden="true">*</span>
          <span class="visually-hidden">(required)</span>
        </label>
        <textarea
          id="poll-question"
          data-test="question-input"
          :value="question"
          rows="4"
          required
          :disabled="isSubmitting"
          :aria-invalid="displayedQuestionError() ? 'true' : undefined"
          :aria-describedby="`question-help${displayedQuestionError() ? ' question-error' : ''}`"
          placeholder="For example: Which day should we hold the team lunch?"
          @input="updateQuestion($event.target.value)"
          @blur="touchQuestion"
        ></textarea>
        <div id="question-help" class="field-help question-help">
          <span>{{ MIN_QUESTION_LENGTH }}–{{ MAX_QUESTION_LENGTH }} characters after trimming.</span>
          <span aria-live="polite">{{ trimmedQuestion.length }}/{{ MAX_QUESTION_LENGTH }}</span>
        </div>
        <p v-if="displayedQuestionError()" id="question-error" class="field-error" role="alert">
          {{ displayedQuestionError() }}
        </p>
      </div>

      <fieldset :aria-describedby="backendOptionsError ? 'options-help options-error' : 'options-help'">
        <legend>Answer options</legend>
        <div class="options-heading">
          <p id="options-help">Add distinct choices. Blank or repeated options are not allowed.</p>
          <span class="option-counter" data-test="option-counter">
            {{ options.length }} of {{ MAX_OPTIONS }} options
          </span>
        </div>

        <p v-if="backendOptionsError" id="options-error" class="field-error" role="alert">
          {{ backendOptionsError }}
        </p>

        <ol class="option-list">
          <li v-for="(option, index) in options" :key="option.id" class="option-row">
            <span class="option-number" aria-hidden="true">{{ index + 1 }}</span>
            <BaseInput
              :id="`poll-${option.id}`"
              :model-value="option.value"
              data-test="option-input"
              :label="`Answer option ${index + 1}`"
              :placeholder="`Option ${index + 1}`"
              :help-text="`Up to ${MAX_OPTION_LENGTH} characters.`"
              :error-message="displayedOptionError(option)"
              :disabled="isSubmitting"
              required
              autocomplete="off"
              @update:model-value="updateOption(option, $event)"
              @blur="touchOption(option)"
            />
            <BaseButton
              class="remove-option"
              data-test="remove-option"
              variant="secondary"
              :disabled="options.length <= MIN_OPTIONS || isSubmitting"
              :aria-label="`Remove answer option ${index + 1}`"
              @click="removeOption(option.id)"
            >
              Remove
            </BaseButton>
          </li>
        </ol>

        <div class="option-actions">
          <BaseButton
            data-test="add-option"
            variant="secondary"
            :disabled="options.length >= MAX_OPTIONS || isSubmitting"
            @click="addOption"
          >
            <template #icon><span aria-hidden="true">+</span></template>
            Add option
          </BaseButton>
          <span v-if="options.length >= MAX_OPTIONS" class="option-limit" role="status">
            Six-option limit reached.
          </span>
        </div>
      </fieldset>

      <div class="form-actions">
        <BaseButton to="/" variant="secondary">Cancel</BaseButton>
        <BaseButton
          data-test="create-poll"
          type="submit"
          :disabled="isSubmitDisabled"
          :loading="isSubmitting"
          loading-text="Creating poll…"
        >
          Create poll
        </BaseButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
h1 {
  margin-bottom: var(--space-4);
  font-size: clamp(2.2rem, 6vw, 3.6rem);
}

.lead {
  max-width: 42rem;
  margin-bottom: var(--space-6);
}

.poll-form {
  display: grid;
  gap: var(--space-6);
  padding: clamp(1.25rem, 4vw, 2rem);
}

.question-field,
fieldset {
  display: grid;
  gap: var(--space-2);
}

label,
legend {
  color: var(--color-text);
  font-size: 0.96rem;
  font-weight: 800;
}

.required-marker {
  color: var(--color-danger);
}

textarea {
  width: 100%;
  min-height: 7.5rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  color: var(--color-text);
  background: var(--color-surface);
  resize: vertical;
  transition:
    border-color var(--transition),
    box-shadow var(--transition);
}

textarea:hover:not(:disabled) {
  border-color: #9ca6ba;
}

textarea:focus-visible {
  border-color: var(--color-primary);
  outline: 3px solid #ffb547;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--color-primary-soft);
}

textarea:disabled {
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  cursor: not-allowed;
}

.question-field--invalid textarea {
  border-color: var(--color-danger);
}

.field-help {
  color: var(--color-text-muted);
  font-size: 0.86rem;
}

.question-help {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.field-error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.86rem;
  font-weight: 650;
}

fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.options-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-2);
}

.options-heading p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.88rem;
}

.option-counter {
  flex: 0 0 auto;
  padding: 0.3rem 0.7rem;
  border: 1px solid #d9d3ff;
  border-radius: var(--radius-pill);
  color: var(--color-primary-dark);
  background: var(--color-primary-soft);
  font-size: 0.78rem;
  font-weight: 800;
}

.option-list {
  display: grid;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.option-row {
  display: grid;
  align-items: start;
  gap: var(--space-3);
  grid-template-columns: 2.25rem minmax(0, 1fr) auto;
}

.option-number {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  margin-top: 1.75rem;
  border-radius: var(--radius-sm);
  color: var(--color-primary-dark);
  background: var(--color-primary-soft);
  font-size: 0.85rem;
  font-weight: 800;
  place-items: center;
}

.remove-option {
  min-height: 3rem;
  margin-top: 1.55rem;
}

.option-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.option-limit {
  color: var(--color-text-muted);
  font-size: 0.84rem;
  font-weight: 650;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
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

@media (max-width: 40rem) {
  .options-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .option-row {
    grid-template-columns: 2.25rem minmax(0, 1fr);
  }

  .remove-option {
    width: max-content;
    margin: 0;
    grid-column: 2;
  }
}

@media (max-width: 31rem) {
  .question-help,
  .option-actions,
  .form-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .option-actions > :first-child,
  .form-actions > :deep(*) {
    width: 100%;
  }
}
</style>