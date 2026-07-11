/**
 * The catalogue tag filter must only appear when there is something to filter.
 * Backend now returns ONLY tags used by an active package, so an empty
 * `store.tagOptions` means "no useful tags" — in that case the whole TAGS
 * section (its label + the chip row) must not render, rather than showing an
 * empty "TAGS" heading. Everything else (category/kind/search) is untouched.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reactive } from 'vue';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('vbwd-view-component', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('vbwd-view-component');
  return { ...actual, useAuthStore: () => ({ isAuthenticated: false, user: null }) };
});

const mockRoute = reactive({ path: '/software', query: {} as Record<string, string> });
const mockRouterPush = vi.fn((loc: { path?: string; query?: Record<string, string> }) => {
  if (loc.path) mockRoute.path = loc.path;
  mockRoute.query = { ...(loc.query || {}) };
});

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ push: mockRouterPush }),
}));

// tagOptions come from ghrmApi.listTags — each test overrides the resolved list.
const listTags = vi.fn(async () => [] as Array<{ slug: string; name: string }>);
vi.mock('../src/api/ghrmApi', () => ({
  ghrmApi: {
    getCategories: vi.fn(async () => ({ categories: [] })),
    listTags: () => listTags(),
  },
}));

import GhrmCatalogueContent from '../src/views/GhrmCatalogueContent.vue';
import { useGhrmStore } from '../src/stores/useGhrmStore';

const tFallback = (key: string) => key;

async function mountCatalogue() {
  mockRoute.path = '/software';
  mockRoute.query = {};
  const store = useGhrmStore();
  vi.spyOn(store, 'fetchPackages').mockResolvedValue(undefined as never);
  store.packages = { items: [], pages: 1, total: 0, page: 1, per_page: 12 };
  const wrapper = mount(GhrmCatalogueContent, {
    global: { mocks: { $t: tFallback }, stubs: { RouterLink: RouterLinkStub } },
  });
  await flushPromises();
  return { wrapper, store };
}

describe('GhrmCatalogueContent — tag filter visibility', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockRouterPush.mockClear();
    listTags.mockReset();
  });

  it('hides the whole TAGS section when there are no tag options', async () => {
    listTags.mockResolvedValue([]);
    const { wrapper, store } = await mountCatalogue();

    expect(store.tagOptions).toEqual([]);
    expect(wrapper.find('.ghrm-filter-field--tags').exists()).toBe(false);
    // The category + kind fields stay put.
    expect(wrapper.find('[data-testid="ghrm-kind-all"]').exists()).toBe(true);
  });

  it('renders the TAGS section when there are tag options', async () => {
    listTags.mockResolvedValue([{ slug: 'vue', name: 'Vue' }]);
    const { wrapper, store } = await mountCatalogue();

    expect(store.tagOptions.length).toBe(1);
    expect(wrapper.find('.ghrm-filter-field--tags').exists()).toBe(true);
    expect(wrapper.find('[data-testid="ghrm-tag-vue"]').exists()).toBe(true);
  });
});
