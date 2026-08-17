import { createRouter, createWebHistory } from 'vue-router'
import { protectRoute } from '@/auth/auth0'
import LandingView from '@/views/LandingView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: LandingView,
      meta: { title: 'Poll Builder' },
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
      props: true,
      meta: { title: 'Vote' },
    },
    {
      path: '/poll/:code/results',
      name: 'poll-results',
      component: () => import('@/views/ResultsView.vue'),
      props: true,
      meta: { title: 'Poll results' },
    },
    {
      path: '/poll/:code/manage',
      name: 'manage-poll',
      component: () => import('@/views/ManagePollView.vue'),
      props: true,
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

router.beforeEach((to) => {
  if (!to.meta.requiresAuth) return true
  return protectRoute(to)
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | Poll Builder` : 'Poll Builder'
})

export default router