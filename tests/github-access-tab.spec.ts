import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const mockGetAccessStatus = vi.fn()
const mockGetPackageInstall = vi.fn()
const mockGetOAuthUrl = vi.fn()
const mockDisconnect = vi.fn()

vi.mock('../src/api/ghrmApi', () => ({
  ghrmApi: {
    getAccessStatus: (...args: unknown[]) => mockGetAccessStatus(...args),
    getPackageInstall: (...args: unknown[]) => mockGetPackageInstall(...args),
    getOAuthUrl: (...args: unknown[]) => mockGetOAuthUrl(...args),
    disconnect: (...args: unknown[]) => mockDisconnect(...args),
  },
}))

import GhrmPlanGithubAccessTab from '../src/components/GhrmPlanGithubAccessTab.vue'

const tFallback = (key: string, params?: Record<string, unknown>) => {
  if (params && Object.keys(params).length) {
    return `${key}:${Object.values(params).join(',')}`
  }
  return key
}

const mountTab = async () => {
  const wrapper = mount(GhrmPlanGithubAccessTab, {
    props: { planSlug: 'acme', planId: 'plan-1' },
    global: {
      mocks: { $t: tFallback },
      stubs: {
        GhrmGithubConnectButton: {
          template: '<div data-testid="ghrm-connect-github-stub" />',
        },
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('GhrmPlanGithubAccessTab — per-package membership states', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGetPackageInstall.mockResolvedValue({})
  })

  it('connected:false renders only the Connect CTA, no membership rows', async () => {
    mockGetAccessStatus.mockResolvedValue({ connected: false })

    const wrapper = await mountTab()

    expect(wrapper.find('[data-testid="ghrm-connect-github-stub"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="membership-row"]')).toHaveLength(0)
  })

  it('renders one row per membership (multiple memberships)', async () => {
    mockGetAccessStatus.mockResolvedValue({
      connected: true,
      github_username: 'octocat',
      memberships: [
        { package_slug: 'a', package_name: 'Alpha', status: 'invited', invitations_url: 'https://github.com/x/a/invitations' },
        { package_slug: 'b', package_name: 'Beta', status: 'revoked' },
      ],
    })

    const wrapper = await mountTab()

    expect(wrapper.findAll('[data-testid="membership-row"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Alpha')
    expect(wrapper.text()).toContain('Beta')
  })

  it('ACTIVE shows a GitHub link + PAT steps + clone commands built from the membership repos', async () => {
    mockGetAccessStatus.mockResolvedValue({
      connected: true,
      github_username: 'octocat',
      memberships: [{
        package_slug: 'a',
        package_name: 'Alpha',
        status: 'active',
        access_kind: 'repo',
        team: null,
        repos: [{ owner: 'acme', repo: 'repo', github_url: 'https://github.com/acme/repo' }],
      }],
    })

    const wrapper = await mountTab()

    const row = wrapper.find('[data-testid="membership-row"]')
    expect(row.find('[data-testid="chip-active"]').exists()).toBe(true)

    const panel = row.find('[data-testid="install-panel"]')
    expect(panel.exists()).toBe(true)
    // GitHub hyperlink to the repo
    const link = panel.find('[data-testid="github-repo-link"]')
    expect(link.attributes('href')).toBe('https://github.com/acme/repo')
    // clone commands built from repo + connected username (no install fetch)
    expect(panel.text()).toContain('git clone https://octocat:<PAT>@github.com/acme/repo.git')
    expect(panel.text()).toContain('git clone git@github.com:acme/repo.git')
    // the fragile per-package install endpoint is no longer used
    expect(mockGetPackageInstall).not.toHaveBeenCalled()
  })

  it('ACTIVE bundle renders a GitHub link + clone block for EVERY repo', async () => {
    mockGetAccessStatus.mockResolvedValue({
      connected: true,
      github_username: 'octocat',
      memberships: [{
        package_slug: 'bundle', package_name: 'Bundle', status: 'active', access_kind: 'repo', team: null,
        repos: [
          { owner: 'acme', repo: 'one', github_url: 'https://github.com/acme/one' },
          { owner: 'acme', repo: 'two', github_url: 'https://github.com/acme/two' },
        ],
      }],
    })

    const wrapper = await mountTab()

    const row = wrapper.find('[data-testid="membership-row"]')
    expect(row.findAll('[data-testid="repo-block"]')).toHaveLength(2)
    const links = row.findAll('[data-testid="github-repo-link"]').map((l) => l.attributes('href'))
    expect(links).toEqual(['https://github.com/acme/one', 'https://github.com/acme/two'])
    expect(row.text()).toContain('git clone git@github.com:acme/one.git')
    expect(row.text()).toContain('git clone git@github.com:acme/two.git')
  })

  it('every ACTIVE membership shows its own panel (the Analytics-blank regression)', async () => {
    mockGetAccessStatus.mockResolvedValue({
      connected: true,
      github_username: 'octocat',
      memberships: [
        { package_slug: 'a', package_name: 'Alpha', status: 'active', access_kind: 'repo', team: null,
          repos: [{ owner: 'acme', repo: 'a', github_url: 'https://github.com/acme/a' }] },
        { package_slug: 'b', package_name: 'Beta', status: 'active', access_kind: 'repo', team: null,
          repos: [{ owner: 'acme', repo: 'b', github_url: 'https://github.com/acme/b' }] },
      ],
    })

    const wrapper = await mountTab()

    expect(wrapper.findAll('[data-testid="install-panel"]')).toHaveLength(2)
  })

  it('ACTIVE team-kind membership shows a team link, not per-repo clone blocks', async () => {
    mockGetAccessStatus.mockResolvedValue({
      connected: true,
      github_username: 'octocat',
      memberships: [{
        package_slug: 't', package_name: 'TeamPkg', status: 'active', access_kind: 'team', repos: [],
        team: { org: 'VBWD-platform', slug: 'vbwd-dev', url: 'https://github.com/orgs/VBWD-platform/teams/vbwd-dev' },
      }],
    })

    const wrapper = await mountTab()

    const row = wrapper.find('[data-testid="membership-row"]')
    const teamLink = row.find('[data-testid="github-team-link"]')
    expect(teamLink.attributes('href')).toBe('https://github.com/orgs/VBWD-platform/teams/vbwd-dev')
    expect(row.find('[data-testid="repo-block"]').exists()).toBe(false)
  })

  it('INVITED shows invitation chip and a link to invitations_url', async () => {
    mockGetAccessStatus.mockResolvedValue({
      connected: true,
      github_username: 'octocat',
      memberships: [{
        package_slug: 'a',
        package_name: 'Alpha',
        status: 'invited',
        invited_at: '2026-06-01T00:00:00Z',
        invitations_url: 'https://github.com/acme/repo/invitations',
      }],
    })

    const wrapper = await mountTab()

    const row = wrapper.find('[data-testid="membership-row"]')
    expect(row.find('[data-testid="chip-invited"]').exists()).toBe(true)
    const link = row.find('[data-testid="invitation-link"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://github.com/acme/repo/invitations')
    // never an install panel for invited
    expect(row.find('[data-testid="install-panel"]').exists()).toBe(false)
  })

  it('GRACE shows the grace chip with the expiry date', async () => {
    mockGetAccessStatus.mockResolvedValue({
      connected: true,
      github_username: 'octocat',
      memberships: [{
        package_slug: 'a',
        package_name: 'Alpha',
        status: 'grace',
        grace_expires_at: '2026-07-01T00:00:00Z',
      }],
    })

    const wrapper = await mountTab()

    const row = wrapper.find('[data-testid="membership-row"]')
    expect(row.find('[data-testid="chip-grace"]').exists()).toBe(true)
    expect(row.text()).toContain('2026-07-01T00:00:00Z')
    expect(row.find('[data-testid="install-panel"]').exists()).toBe(false)
  })

  it('REVOKED shows the revoked chip and no install panel', async () => {
    mockGetAccessStatus.mockResolvedValue({
      connected: true,
      github_username: 'octocat',
      memberships: [{ package_slug: 'a', package_name: 'Alpha', status: 'revoked' }],
    })

    const wrapper = await mountTab()

    const row = wrapper.find('[data-testid="membership-row"]')
    expect(row.find('[data-testid="chip-revoked"]').exists()).toBe(true)
    expect(row.text()).toContain('ghrm.membership.revokedLabel')
    expect(row.find('[data-testid="install-panel"]').exists()).toBe(false)
  })

  it('ERROR shows the error chip and NEVER the connected/active affordance', async () => {
    mockGetAccessStatus.mockResolvedValue({
      connected: true,
      github_username: 'octocat',
      memberships: [{ package_slug: 'a', package_name: 'Alpha', status: 'error', last_error: 'invite failed' }],
    })

    const wrapper = await mountTab()

    const row = wrapper.find('[data-testid="membership-row"]')
    expect(row.find('[data-testid="chip-error"]').exists()).toBe(true)
    expect(row.text()).toContain('ghrm.membership.errorLabel')
    // must never show the ACTIVE affordances
    expect(row.find('[data-testid="chip-active"]').exists()).toBe(false)
    expect(row.find('[data-testid="install-panel"]').exists()).toBe(false)
    // and must never call install for an errored membership
    expect(mockGetPackageInstall).not.toHaveBeenCalled()
  })

  it('clicking copy on the clone command writes it to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    mockGetAccessStatus.mockResolvedValue({
      connected: true,
      github_username: 'octocat',
      memberships: [{
        package_slug: 'a', package_name: 'Alpha', status: 'active', access_kind: 'repo', team: null,
        repos: [{ owner: 'acme', repo: 'repo', github_url: 'https://github.com/acme/repo' }],
      }],
    })

    const wrapper = await mountTab()
    await wrapper.find('[data-testid="copy-clone-https"]').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('git clone https://octocat:<PAT>@github.com/acme/repo.git')
  })
})
