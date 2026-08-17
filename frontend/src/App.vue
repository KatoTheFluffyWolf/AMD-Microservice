<script setup>
import { RouterLink, RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <AppHeader />

    <main id="main-content" class="app-main" tabindex="-1">
      <RouterView />
    </main>

    <footer class="app-footer">
      <div class="page-container footer-inner">
        <RouterLink class="footer-brand" to="/">Poll Builder</RouterLink>
        <p>Clear questions. Quick votes. Live results.</p>
        <p class="footer-note">Built with Vue 3.</p>
      </div>
    </footer>
  </div>
</template>
