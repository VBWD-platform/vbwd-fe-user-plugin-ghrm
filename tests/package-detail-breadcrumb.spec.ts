/**
 * The GHRM package detail feeds the real package DISPLAY NAME into the shared
 * CMS breadcrumb via the generic current-crumb override seam (keyed by route
 * path), and clears it when the page unmounts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('vbwd-view-component', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('vbwd-view-component');
  return { ...actual, useAuthStore: () => ({ isAuthenticated: false, user: null }) };
});

vi.mock('../src/api/ghrmApi', () => ({
  ghrmApi: {
    getCategories: vi.fn(async () => ({ categories: [] })),
    getPackage: vi.fn(async () => ({})),
    getAccessStatus: vi.fn(async () => ({})),
  },
}));

const ROUTE_PATH = '/category/tools/widget';

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: ROUTE_PATH, params: { category_slug: 'tools', package_slug: 'widget' } }),
  useRouter: () => ({ push: vi.fn() }),
}));

import GhrmPackageDetail from '../src/views/GhrmPackageDetail.vue';
import { useGhrmStore } from '../src/stores/useGhrmStore';
import { getBreadcrumbLabel } from '../../cms/src/composables/useBreadcrumbLabel';
import type { GhrmPackage } from '../src/api/ghrmApi';

const tFallback = (key: string) => key;

function makePackage(overrides: Partial<GhrmPackage>): GhrmPackage {
  return {
    id: 'pkg-1', slug: 'widget', name: 'Tarot', tariff_plan_id: 'plan-1',
    description: 'A widget', author_name: 'Acme', icon_url: null,
    github_owner: 'acme', github_repo: 'widget', github_protected_branch: 'release',
    download_counter: 0, readme: null, changelog: null, docs: null, screenshots: [],
    cached_releases: [], latest_version: null, latest_released_at: null, last_synced_at: null,
    related_slugs: [],
    ...overrides,
  };
}

async function mountDetail(overrides: Partial<GhrmPackage> = {}) {
  const store = useGhrmStore();
  store.currentPackage = makePackage(overrides);
  vi.spyOn(store, 'fetchPackage').mockResolvedValue(undefined as never);
  vi.spyOn(store, 'fetchRelated').mockResolvedValue(undefined as never);
  vi.spyOn(store, 'fetchVersions').mockResolvedValue(undefined as never);
  vi.spyOn(store, 'fetchAccessStatus').mockResolvedValue(undefined as never);
  const wrapper = mount(GhrmPackageDetail, {
    global: {
      mocks: { $t: tFallback },
      stubs: { RouterLink: RouterLinkStub, GhrmMarkdownRenderer: true, GhrmVersionsTable: true },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('GhrmPackageDetail — CMS breadcrumb label override', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('sets the breadcrumb override to the loaded package name for the route path', async () => {
    await mountDetail({ name: 'Tarot' });
    expect(getBreadcrumbLabel(ROUTE_PATH)).toBe('Tarot');
  });

  it('clears the breadcrumb override on unmount', async () => {
    const wrapper = await mountDetail({ name: 'Tarot' });
    wrapper.unmount();
    await flushPromises();
    expect(getBreadcrumbLabel(ROUTE_PATH)).toBeUndefined();
  });
});
