import './assets/main.css'

import { createApp } from 'vue'
import { installAuthentication } from './auth/auth0'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// Install the router first so Auth0 can restore the protected route after its callback.
app.use(router)
installAuthentication(app)

app.mount('#app')