/**
 * Each catalogue card carries a kind badge so a shopper can tell a single
 * package from a bundle at a glance: a "Bundle" badge (layers icon) for
 * package_kind==='bundle', a "Package" badge (box icon) otherwise.
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
    listTags: vi.fn(async () => []),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/software', query: {} }),
  useRouter: () => ({ push: vi.fn() }),
}));

import GhrmCatalogueContent from '../src/views/GhrmCatalogueContent.vue';
import { useGhrmStore } from '../src/stores/useGhrmStore';

const tFallback = (key: string) => (key === 'ghrm.bundle' ? 'Bundle' : key === 'ghrm.singlePackage' ? 'Package' : key);

async function mountWith(items: Array<Record<string, unknown>>) {
  const store = useGhrmStore();
  // @ts-expect-error — partial paginated shape is enough for the list render
  store.packages = { items, pages: 1, total: items.length };
  vi.spyOn(store, 'fetchPackages').mockResolvedValue(undefined as never);
  const wrapper = mount(GhrmCatalogueContent, {
    global: { mocks: { $t: tFallback }, stubs: { RouterLink: RouterLinkStub } },
  });
  await flushPromises();
  return wrapper;
}

const item = (over: Record<string, unknown>) => ({
  id: 'x', slug: 's', name: 'N', author_name: 'A', icon_url: null,
  download_counter: 0, latest_version: null, package_kind: 'single', ...over,
});

describe('GhrmCatalogueContent — single vs bundle kind badge', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('shows a Bundle badge for a bundle package', async () => {
    const wrapper = await mountWith([item({ id: 'b', slug: 'bundle-cms', package_kind: 'bundle' })]);
    const badge = wrapper.find('.ghrm-pkg-badge');
    expect(badge.exists()).toBe(true);
    expect(badge.classes()).toContain('ghrm-pkg-badge--bundle');
    expect(badge.text()).toBe('Bundle');
    expect(badge.find('svg').exists()).toBe(true);
  });

  it('shows a Package badge for a single package', async () => {
    const wrapper = await mountWith([item({ id: 'p', slug: 'stripe', package_kind: 'single' })]);
    const badge = wrapper.find('.ghrm-pkg-badge');
    expect(badge.classes()).toContain('ghrm-pkg-badge--single');
    expect(badge.text()).toBe('Package');
    expect(badge.find('svg').exists()).toBe(true);
  });
});
