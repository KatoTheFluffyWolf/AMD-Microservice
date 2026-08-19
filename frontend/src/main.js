import './assets/main.css'

import { createApp } from 'vue'
import { initializeAuthentication, invalidateAuthentication } from './auth/auth'
import App from './App.vue'
import router from './router'

async function bootstrap() {
  try {
    await initializeAuthentication()
  } catch {
    invalidateAuthentication('')
  }

  const app = createApp(App)
  app.use(router)
  app.mount('#app')
}

void bootstrap()
