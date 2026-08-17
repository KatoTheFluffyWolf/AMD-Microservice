<template>
  <section class="not-found page-narrow" aria-labelledby="not-found-title">
    <div class="error-code" aria-hidden="true">404</div>
    <p class="eyebrow">Page not found</p>
    <h1 id="not-found-title">This poll link leads nowhere.</h1>
    <p class="lead">
      The address may be incomplete, or the page may have moved. Return home to create a new poll.
    </p>
    <RouterLink class="button button-primary" to="/">Back to home</RouterLink>
  </section>
</template>

<style scoped>
.not-found {
  display: grid;
  min-height: 34rem;
  align-content: center;
  justify-items: start;
  padding-block: var(--space-8);
}

.error-code {
  margin-bottom: calc(var(--space-5) * -1);
  color: #e5e1fb;
  font-size: clamp(6rem, 25vw, 12rem);
  font-weight: 900;
  letter-spacing: -0.08em;
  line-height: 0.9;
  user-select: none;
}

h1 {
  max-width: 38rem;
  margin-bottom: var(--space-4);
  font-size: clamp(2.1rem, 6vw, 3.5rem);
}

.lead {
  max-width: 38rem;
  margin-bottom: var(--space-6);
}
</style>
