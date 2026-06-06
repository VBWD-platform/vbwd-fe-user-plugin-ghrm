import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const mockHandleOAuthCallback = vi.fn()
const mockPush = vi.fn()

vi.mock('../src/api/ghrmApi', () => ({
  ghrmApi: {
    handleOAuthCallback: (...args: unknown[]) => mockHandleOAuthCallback(...args),
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import GhrmOAuthCallback from '../src/views/GhrmOAuthCallback.vue'

const tFallback = (key: string) => key

const setSearch = (search: string) => {
  Object.defineProperty(window, 'location', {
    value: { search },
    configurable: true,
    writable: true,
  })
}

const mountCallback = async () => {
  const wrapper = mount(GhrmOAuthCallback, {
    global: { mocks: { $t: tFallback } },
  })
  await flushPromises()
  // advance the success redirect timer
  vi.runAllTimers()
  await flushPromises()
  return wrapper
}

describe('GhrmOAuthCallback — redirects to an existing route', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('on success redirects to /dashboard (an existing route), never /dashboard/settings', async () => {
    setSearch('?code=abc&state=xyz')
    mockHandleOAuthCallback.mockResolvedValue({ connected: true })

    await mountCallback()

    expect(mockHandleOAuthCallback).toHaveBeenCalledWith('abc', 'xyz')
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
    const pushedTargets = mockPush.mock.calls.map((call) => call[0])
    expect(pushedTargets).not.toContain('/dashboard/settings#github')
  })

  it('on missing code shows error and offers a link back to an existing route', async () => {
    setSearch('?state=xyz')

    const wrapper = await mountCallback()

    expect(mockHandleOAuthCallback).not.toHaveBeenCalled()
    const link = wrapper.find('router-link')
    expect(link.exists()).toBe(true)
    expect(link.attributes('to')).toBe('/dashboard')
  })
})
