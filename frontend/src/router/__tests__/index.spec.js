import { describe, expect, it } from 'vitest'
import router from '@/router'

describe('application routes', () => {
  it('registers every foundation route', () => {
    const routeNames = router.getRoutes().map((route) => route.name)

    expect(routeNames).toEqual(
      expect.arrayContaining([
        'home',
        'create-poll',
        'vote',
        'poll-results',
        'manage-poll',
        'not-found',
      ]),
    )
  })

  it('marks creator routes as requiring authentication', () => {
    expect(router.resolve('/create').meta.requiresAuth).toBe(true)
    expect(router.resolve('/poll/7fGh2/manage').meta.requiresAuth).toBe(true)
    expect(router.resolve('/poll/7fGh2').meta.requiresAuth).toBeUndefined()
    expect(router.resolve('/poll/7fGh2/results').meta.requiresAuth).toBeUndefined()
  })
})
