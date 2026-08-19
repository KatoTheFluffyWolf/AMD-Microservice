<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { register, safeRedirectPath } from '@/auth/auth'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const route = useRoute()
const router = useRouter()

const userName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const userNameError = ref('')
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const submissionError = ref('')
const isSubmitting = ref(false)

const canSubmit = computed(
  () =>
    Boolean(
      userName.value.trim() && email.value.trim() && password.value && confirmPassword.value,
    ) && !isSubmitting.value,
)

const loginRoute = computed(() => {
  const redirect = safeRedirectPath(route.query.redirect, '')
  return redirect ? { name: 'login', query: { redirect } } : { name: 'login' }
})

function passwordValidationMessage(value) {
  const missingRequirements = []

  if (value.length < 6) missingRequirements.push('at least six characters')
  if (!/[A-Z]/.test(value)) missingRequirements.push('one uppercase letter')
  if (!/[a-z]/.test(value)) missingRequirements.push('one lowercase letter')
  if (!/\d/.test(value)) missingRequirements.push('one digit')
  if (!/[^A-Za-z0-9]/.test(value)) missingRequirements.push('one non-alphanumeric character')

  return missingRequirements.length
    ? `Password must include ${missingRequirements.join(', ')}.`
    : ''
}

function validate() {
  const normalizedUserName = userName.value.trim()
  const normalizedEmail = email.value.trim()

  userNameError.value = !normalizedUserName
    ? 'Username is required.'
    : normalizedUserName.length > 100
      ? 'Username must be 100 characters or fewer.'
      : ''

  emailError.value = !normalizedEmail
    ? 'Email is required.'
    : !EMAIL_PATTERN.test(normalizedEmail)
      ? 'Enter a valid email address.'
      : normalizedEmail.length > 255
        ? 'Email must be 255 characters or fewer.'
        : ''

  passwordError.value = passwordValidationMessage(password.value)
  confirmPasswordError.value = !confirmPassword.value
    ? 'Confirm your password.'
    : confirmPassword.value !== password.value
      ? 'Passwords do not match.'
      : ''

  return !(
    userNameError.value ||
    emailError.value ||
    passwordError.value ||
    confirmPasswordError.value
  )
}

function clearPasswordErrors() {
  passwordError.value = ''
  confirmPasswordError.value = ''
}

async function submitRegistration() {
  if (isSubmitting.value) return

  submissionError.value = ''
  if (!validate()) return

  isSubmitting.value = true

  try {
    await register({
      userName: userName.value.trim(),
      email: email.value.trim(),
      password: password.value,
    })
    await router.replace(safeRedirectPath(route.query.redirect, '/create'))
  } catch (error) {
    const identityErrors = Array.isArray(error?.validationErrors)
      ? error.validationErrors.filter((message) => typeof message === 'string' && message.trim())
      : []

    submissionError.value =
      identityErrors.join(' ') ||
      (typeof error?.message === 'string' && error.message.trim()
        ? error.message.trim()
        : 'Registration could not be completed. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="page-section page-narrow auth-page" aria-labelledby="register-title">
    <div class="auth-heading">
      <p class="eyebrow">Creator account</p>
      <h1 id="register-title">Register</h1>
      <p class="lead">Create an account to build and manage polls.</p>
    </div>

    <form class="surface-card auth-form" novalidate @submit.prevent="submitRegistration">
      <ErrorAlert v-if="submissionError" :message="submissionError" />

      <BaseInput
        v-model="userName"
        id="register-username"
        label="Username"
        name="username"
        autocomplete="username"
        :error-message="userNameError"
        :disabled="isSubmitting"
        maxlength="100"
        required
        @update:model-value="userNameError = ''"
      />

      <BaseInput
        v-model="email"
        id="register-email"
        label="Email"
        name="email"
        type="email"
        autocomplete="email"
        :error-message="emailError"
        :disabled="isSubmitting"
        maxlength="255"
        required
        @update:model-value="emailError = ''"
      />

      <BaseInput
        v-model="password"
        id="register-password"
        label="Password"
        name="password"
        type="password"
        autocomplete="new-password"
        help-text="Use 6+ characters with uppercase, lowercase, a digit and a symbol."
        :error-message="passwordError"
        :disabled="isSubmitting"
        required
        @update:model-value="clearPasswordErrors"
      />

      <BaseInput
        v-model="confirmPassword"
        id="register-confirm-password"
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autocomplete="new-password"
        :error-message="confirmPasswordError"
        :disabled="isSubmitting"
        required
        @update:model-value="confirmPasswordError = ''"
      />

      <BaseButton
        data-test="register-submit"
        type="submit"
        :disabled="!canSubmit"
        :loading="isSubmitting"
        loading-text="Creating account…"
      >
        Register
      </BaseButton>

      <p class="auth-switch">
        Already have an account?
        <RouterLink :to="loginRoute">Log in</RouterLink>
      </p>
    </form>
  </section>
</template>

<style scoped>
.auth-page {
  min-height: 44rem;
}

.auth-heading {
  margin-bottom: var(--space-6);
}

h1 {
  margin-bottom: var(--space-3);
  font-size: clamp(2.2rem, 6vw, 3.6rem);
}

.lead {
  margin: 0;
}

.auth-form {
  display: grid;
  gap: var(--space-5);
  padding: clamp(1.25rem, 5vw, 2rem);
}

.auth-form :deep(.base-button) {
  width: 100%;
}

.auth-switch {
  margin: 0;
  color: var(--color-text-muted);
  text-align: center;
}

.auth-switch a {
  font-weight: 750;
}
</style>
