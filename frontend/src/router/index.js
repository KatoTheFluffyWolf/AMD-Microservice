import { createRouter, createWebHistory } from 'vue-router'
import { protectRoute } from '@/auth/auth'
import LandingView from '@/views/LandingView.vue'

export function createAppRouter(history = createWebHistory(import.meta.env.BASE_URL)) {
  const router = createRouter({
    history,
    scrollBehavior(to, _from, savedPosition) {
      if (savedPosition) return savedPosition
      if (to.hash) return { el: to.hash, behavior: 'smooth' }
      return { top: 0 }
    },
    routes: [
      { path: '/', name: 'home', component: LandingView, meta: { title: 'Poll Builder' } },
      {
        path: '/login',
        name: 'login',
        component: () => import('@/views/LoginView.vue'),
        meta: { title: 'Sign in' },
      },
      {
        path: '/register',
        name: 'register',
        component: () => import('@/views/RegisterView.vue'),
        meta: { title: 'Create account' },
      },
      {
        path: '/create',
        name: 'create-poll',
        component: () => import('@/views/CreatePollView.vue'),
        meta: { title: 'Create a poll', requiresAuth: true },
      },
      {
        path: '/poll/:code',
        name: 'vote',
        component: () => import('@/views/VoteView.vue'),
        meta: { title: 'Vote' },
      },
      {
        path: '/poll/:code/results',
        name: 'poll-results',
        component: () => import('@/views/ResultsView.vue'),
        meta: { title: 'Poll results' },
      },
      {
        path: '/poll/:code/manage',
        name: 'manage-poll',
        component: () => import('@/views/ManagePollView.vue'),
        meta: { title: 'Manage poll', requiresAuth: true },
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFoundView.vue'),
        meta: { title: 'Page not found' },
      },
    ],
  })

  router.beforeEach((to) => (to.meta.requiresAuth ? protectRoute(to) : true))
  router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} | Poll Builder` : 'Poll Builder'
  })

  return router
}

const router = createAppRouter()
export default router
