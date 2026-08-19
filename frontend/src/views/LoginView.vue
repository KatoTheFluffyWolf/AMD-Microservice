<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login, safeRedirectPath } from '@/auth/auth'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'

const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const submissionError = ref('')
const isSubmitting = ref(false)

const canSubmit = computed(
  () => Boolean(email.value.trim() && password.value) && !isSubmitting.value,
)

const registrationRoute = computed(() => {
  const redirect = safeRedirectPath(route.query.redirect, '')
  return redirect ? { name: 'register', query: { redirect } } : { name: 'register' }
})

function validate() {
  emailError.value = email.value.trim() ? '' : 'Email is required.'
  passwordError.value = password.value ? '' : 'Password is required.'
  return !emailError.value && !passwordError.value
}

async function submitLogin() {
  if (isSubmitting.value) return

  submissionError.value = ''
  if (!validate()) return

  isSubmitting.value = true

  try {
    await login({
      email: email.value.trim(),
      password: password.value,
    })
    await router.replace(safeRedirectPath(route.query.redirect, '/create'))
  } catch (error) {
    submissionError.value =
      typeof error?.message === 'string' && error.message.trim()
        ? error.message.trim()
        : 'Sign-in could not be completed. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="page-section page-narrow auth-page" aria-labelledby="login-title">
    <div class="auth-heading">
      <p class="eyebrow">Creator account</p>
      <h1 id="login-title">Log in</h1>
      <p class="lead">Access your creator tools and manage your polls.</p>
    </div>

    <form class="surface-card auth-form" novalidate @submit.prevent="submitLogin">
      <ErrorAlert v-if="submissionError" :message="submissionError" />

      <BaseInput
        v-model="email"
        id="login-email"
        label="Email"
        name="email"
        type="email"
        autocomplete="email"
        :error-message="emailError"
        :disabled="isSubmitting"
        required
        @update:model-value="emailError = ''"
      />

      <BaseInput
        v-model="password"
        id="login-password"
        label="Password"
        name="password"
        type="password"
        autocomplete="current-password"
        :error-message="passwordError"
        :disabled="isSubmitting"
        required
        @update:model-value="passwordError = ''"
      />

      <BaseButton
        data-test="login-submit"
        type="submit"
        :disabled="!canSubmit"
        :loading="isSubmitting"
        loading-text="Logging in…"
      >
        Log in
      </BaseButton>

      <p class="auth-switch">
        Need an account?
        <RouterLink :to="registrationRoute">Register</RouterLink>
      </p>
    </form>
  </section>
</template>

<style scoped>
.auth-page {
  min-height: 38rem;
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
