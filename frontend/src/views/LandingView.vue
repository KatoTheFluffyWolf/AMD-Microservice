<template>
  <div>
    <section class="hero page-container" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">Real-time polling, made simple</p>
        <h1 id="hero-title">Ask one clear question. Get answers as they happen.</h1>
        <p class="lead">
          Create a multiple-choice poll, share one short link, and watch every vote appear in real
          time.
        </p>

        <div class="hero-actions">
          <RouterLink class="button button-primary" to="/create">
            Create a poll
            <span aria-hidden="true">→</span>
          </RouterLink>
          <a class="button button-secondary" href="#how-it-works">See how it works</a>
        </div>

        <ul class="trust-list" aria-label="Service highlights">
          <li><span aria-hidden="true">✓</span> Up to 6 options</li>
          <li><span aria-hidden="true">✓</span> No voter login</li>
          <li><span aria-hidden="true">✓</span> Live results</li>
        </ul>
      </div>

      <div class="poll-preview" aria-label="Example poll preview">
        <div class="preview-glow" aria-hidden="true"></div>
        <article class="surface-card preview-card">
          <header class="preview-header">
            <span>Team lunch poll</span>
            <span class="live-badge"><i aria-hidden="true"></i> Live</span>
          </header>

          <div class="preview-body">
            <p class="preview-label">Choose one answer</p>
            <h2>Where should we go for lunch?</h2>
            <div class="preview-options" aria-hidden="true">
              <span><i></i> Vietnamese</span>
              <span class="selected"><i></i> Japanese</span>
              <span><i></i> Italian</span>
            </div>
          </div>

          <footer class="preview-footer">
            <strong>24 responses</strong>
            <span>Updates live</span>
          </footer>
        </article>
      </div>
    </section>

    <section id="how-it-works" class="how-section">
      <div class="page-container">
        <div class="section-intro">
          <p class="eyebrow">How it works</p>
          <h2>From question to decision in three steps.</h2>
        </div>

        <ol class="steps-grid">
          <li class="surface-card step-card">
            <span class="step-number">01</span>
            <h3>Build your poll</h3>
            <p>Write one question and add up to six clear answer options.</p>
          </li>
          <li class="surface-card step-card">
            <span class="step-number">02</span>
            <h3>Share the link</h3>
            <p>Send the short poll code to anyone who should have a say.</p>
          </li>
          <li class="surface-card step-card">
            <span class="step-number">03</span>
            <h3>Watch results grow</h3>
            <p>See the live chart update as responses arrive, without refreshing.</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="page-container cta-section">
      <div>
        <p class="eyebrow cta-eyebrow">Ready when you are</p>
        <h2>Turn a question into a shared decision.</h2>
      </div>
      <RouterLink class="button cta-button" to="/create">Create your first poll</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.hero {
  display: grid;
  min-height: 41rem;
  align-items: center;
  gap: var(--space-7);
  grid-template-columns: minmax(0, 1.04fr) minmax(22rem, 0.86fr);
  padding-block: var(--space-8);
}

.hero-copy {
  max-width: 42rem;
}

.hero h1 {
  max-width: 43rem;
  margin-bottom: var(--space-5);
}

.hero .lead {
  max-width: 38rem;
  margin-bottom: var(--space-6);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.trust-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4) var(--space-5);
  margin: var(--space-6) 0 0;
  padding: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  list-style: none;
}

.trust-list span {
  color: var(--color-accent);
  font-weight: 900;
}

.poll-preview {
  position: relative;
  padding: var(--space-4);
}

.preview-glow {
  position: absolute;
  inset: 6% 0 0 10%;
  border-radius: 50%;
  background: linear-gradient(140deg, rgb(91 71 224 / 0.28), rgb(25 169 135 / 0.2));
  filter: blur(35px);
}

.preview-card {
  position: relative;
  overflow: hidden;
  border: 0;
  box-shadow: var(--shadow-lg);
  transform: rotate(1.3deg);
}

.preview-header,
.preview-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
}

.preview-header {
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.86rem;
  font-weight: 700;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-pill);
  color: #18735d;
  background: var(--color-accent-soft);
}

.live-badge i {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 0 4px rgb(25 169 135 / 0.14);
}

.preview-body {
  padding: var(--space-6) var(--space-5);
}

.preview-label {
  margin-bottom: var(--space-2);
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview-body h2 {
  margin-bottom: var(--space-5);
  font-size: clamp(1.5rem, 3vw, 2rem);
}

.preview-options {
  display: grid;
  gap: var(--space-3);
}

.preview-options span {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
}

.preview-options span.selected {
  color: var(--color-primary-dark);
  border-color: #a99cf5;
  background: var(--color-primary-soft);
  font-weight: 700;
}

.preview-options i {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid var(--color-border-strong);
  border-radius: 50%;
}

.preview-options .selected i {
  border: 0.28rem solid var(--color-primary);
}

.preview-footer {
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  background: #fbfbfe;
  font-size: 0.86rem;
}

.preview-footer strong {
  color: var(--color-text);
}

.how-section {
  padding-block: var(--space-8);
  border-block: 1px solid var(--color-border);
  background: var(--color-surface);
}

.section-intro {
  max-width: 40rem;
  margin-bottom: var(--space-7);
}

.section-intro h2 {
  margin-bottom: 0;
}

.steps-grid {
  display: grid;
  gap: var(--space-5);
  margin: 0;
  padding: 0;
  grid-template-columns: repeat(3, 1fr);
  list-style: none;
}

.step-card {
  padding: var(--space-6);
}

.step-number {
  display: inline-grid;
  width: 2.65rem;
  height: 2.65rem;
  margin-bottom: var(--space-5);
  border-radius: var(--radius-md);
  color: var(--color-primary-dark);
  background: var(--color-primary-soft);
  font-size: 0.78rem;
  font-weight: 850;
  place-items: center;
}

.step-card h3 {
  margin-bottom: var(--space-2);
}

.step-card p {
  margin: 0;
  color: var(--color-text-muted);
}

.cta-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  margin-block: var(--space-8);
  padding: var(--space-7);
  border-radius: var(--radius-lg);
  color: #ffffff;
  background: linear-gradient(135deg, #4c38c6, #6b55e8 58%, #297f8e);
  box-shadow: var(--shadow-md);
}

.cta-section h2 {
  max-width: 38rem;
  margin: 0;
  color: #ffffff;
}

.cta-eyebrow {
  color: #dcd7ff;
}

.cta-button {
  flex: 0 0 auto;
  color: var(--color-primary-dark);
  background: #ffffff;
}

.cta-button:hover {
  color: var(--color-primary-dark);
  background: #f3f1ff;
}

@media (max-width: 52rem) {
  .hero {
    min-height: auto;
    grid-template-columns: 1fr;
  }

  .poll-preview {
    width: min(100%, 32rem);
    margin-inline: auto;
  }

  .steps-grid {
    grid-template-columns: 1fr;
  }

  .cta-section {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 31rem) {
  .hero-actions .button,
  .cta-button {
    width: 100%;
  }

  .poll-preview {
    padding: 0;
  }

  .preview-card {
    transform: none;
  }

  .cta-section {
    padding: var(--space-6);
  }
}
</style>
