<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthentication } from '@/auth/auth'
import BaseButton from '@/components/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const { isLoading, isAuthenticated, user, errorMessage, logout } = useAuthentication()

const pendingAction = ref('')
const actionError = ref('')

const displayName = computed(() => user.value?.name || user.value?.email || '')
const visibleError = computed(() => actionError.value || (!isLoading.value && errorMessage.value))

function guestRoute(name) {
  const canReturnToCurrentRoute =
    !['home', 'login', 'register'].includes(String(route.name ?? '')) &&
    !['/', '/login', '/register'].includes(route.path)
  return canReturnToCurrentRoute ? { name, query: { redirect: route.fullPath } } : { name }
}

const loginRoute = computed(() => guestRoute('login'))
const registerRoute = computed(() => guestRoute('register'))

async function handleLogout() {
  actionError.value = ''
  pendingAction.value = 'logout'

  try {
    logout()
    await router.replace({ name: 'home' })
  } catch (error) {
    actionError.value = error.message || 'Sign-out could not be completed. Please try again.'
  } finally {
    pendingAction.value = ''
  }
}
</script>

<template>
  <header class="site-header">
    <div class="page-container header-inner">
      <RouterLink class="brand" to="/" aria-label="Poll Builder home">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 18V11M12 18V6M19 18V9" />
          </svg>
        </span>
        <span class="brand-name">Poll Builder</span>
      </RouterLink>

      <div class="header-navigation">
        <nav aria-label="Primary navigation">
          <RouterLink class="nav-link" to="/">Home</RouterLink>

          <div v-if="isLoading" class="auth-loading" role="status" aria-live="polite">
            <span class="auth-loading__shape" aria-hidden="true"></span>
            <span class="visually-hidden">Checking sign-in status</span>
          </div>

          <template v-else-if="isAuthenticated">
            <span v-if="displayName" class="user-name" :title="displayName">
              {{ displayName }}
            </span>
            <BaseButton class="nav-action" to="/create">Create a poll</BaseButton>
            <BaseButton
              variant="secondary"
              class="nav-action"
              :loading="pendingAction === 'logout'"
              loading-text="Signing out…"
              @click="handleLogout"
            >
              Log out
            </BaseButton>
          </template>

          <template v-else>
            <BaseButton variant="secondary" class="nav-action" :to="loginRoute">
              Log in
            </BaseButton>
            <BaseButton class="nav-action" :to="registerRoute">Register</BaseButton>
          </template>
        </nav>

        <p v-if="visibleError" class="auth-error" role="alert">{{ visibleError }}</p>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  z-index: 20;
  top: 0;
  border-bottom: 1px solid rgb(221 226 237 / 0.82);
  background: rgb(255 255 255 / 0.9);
  backdrop-filter: blur(14px);
}

.header-inner {
  display: flex;
  min-height: 4.6rem;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.brand {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text);
  font-size: 1.05rem;
  font-weight: 850;
  letter-spacing: -0.025em;
  text-decoration: none;
}

.brand:hover {
  color: var(--color-primary-dark);
}

.brand-mark {
  display: grid;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 0.7rem;
  color: #ffffff;
  background: linear-gradient(145deg, #755df0, var(--color-primary-dark));
  box-shadow: 0 7px 16px rgb(91 71 224 / 0.23);
  place-items: center;
}

.brand-mark svg {
  width: 1.25rem;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-width: 2.4;
}

.header-navigation {
  position: relative;
}

nav {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-4);
}

.nav-link {
  position: relative;
  padding-block: var(--space-2);
  color: var(--color-text-muted);
  font-weight: 700;
  text-decoration: none;
}

.nav-link:hover,
.nav-link.router-link-exact-active {
  color: var(--color-primary-dark);
}

.nav-link.router-link-exact-active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  content: '';
}

.nav-action {
  min-height: 2.55rem;
  padding: 0.62rem 1rem;
}

.user-name {
  max-width: 10rem;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 0.88rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auth-loading {
  display: flex;
  min-width: 7.5rem;
  justify-content: flex-end;
}

.auth-loading__shape {
  width: 6rem;
  height: 2.55rem;
  border-radius: var(--radius-md);
  background: linear-gradient(
    100deg,
    var(--color-surface-muted) 20%,
    #ffffff 45%,
    var(--color-surface-muted) 70%
  );
  background-size: 220% 100%;
  animation: auth-loading 1.3s ease-in-out infinite;
}

.auth-error {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  width: max-content;
  max-width: min(25rem, calc(100vw - 2rem));
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid #efb9c0;
  border-radius: var(--radius-sm);
  color: #8f2634;
  background: #fff1f3;
  box-shadow: var(--shadow-sm);
  font-size: 0.82rem;
  font-weight: 650;
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

@keyframes auth-loading {
  to {
    background-position-x: -220%;
  }
}

@media (max-width: 46rem) {
  .user-name,
  .nav-link {
    display: none;
  }
}

@media (max-width: 34rem) {
  .header-inner {
    min-height: 4.2rem;
  }

  .brand-name {
    display: none;
  }

  nav {
    gap: var(--space-2);
  }

  .nav-action {
    min-height: 2.4rem;
    padding: 0.55rem 0.72rem;
    font-size: 0.86rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-loading__shape {
    animation: none;
  }
}
</style>
