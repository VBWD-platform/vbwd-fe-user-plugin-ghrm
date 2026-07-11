/**
 * The catalogue tag-filter options are CATEGORY-AWARE: they must be fetched
 * scoped to the currently-selected category (from the URL query) and re-fetched
 * whenever the active category changes. Clearing the category refetches the
 * unscoped set. The store's `fetchTagOptions(categorySlug?)` threads the slug
 * to `ghrmApi.listTags`.
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

const listTags = vi.fn(async (_categorySlug?: string) => [] as Array<{ slug: string; name: string }>);
vi.mock('../src/api/ghrmApi', () => ({
  ghrmApi: {
    getCategories: vi.fn(async () => ({ categories: [{ slug: 'a', label: 'A' }, { slug: 'b', label: 'B' }] })),
    listTags: (categorySlug?: string) => listTags(categorySlug),
  },
}));

import GhrmCatalogueContent from '../src/views/GhrmCatalogueContent.vue';
import { useGhrmStore } from '../src/stores/useGhrmStore';

const tFallback = (key: string) => key;

async function mountCatalogue(initialQuery: Record<string, string> = {}) {
  mockRoute.path = '/software';
  mockRoute.query = { ...initialQuery };
  const store = useGhrmStore();
  vi.spyOn(store, 'fetchPackages').mockResolvedValue(undefined as never);
  store.packages = { items: [], pages: 1, total: 0, page: 1, per_page: 12 };
  const wrapper = mount(GhrmCatalogueContent, {
    global: { mocks: { $t: tFallback }, stubs: { RouterLink: RouterLinkStub } },
  });
  await flushPromises();
  return { wrapper, store };
}

describe('GhrmCatalogueContent — category-aware tag options', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockRouterPush.mockClear();
    listTags.mockReset();
    listTags.mockResolvedValue([]);
  });

  it('fetches tag options scoped to the category in the URL on mount', async () => {
    await mountCatalogue({ category: 'a' });

    expect(listTags).toHaveBeenCalledWith('a');
  });

  it('fetches unscoped tag options when no category is selected on mount', async () => {
    await mountCatalogue();

    expect(listTags).toHaveBeenCalledWith(undefined);
  });

  it('re-fetches tag options with the new category when it changes', async () => {
    await mountCatalogue();
    listTags.mockClear();

    // A category change flows through the URL query (single source of truth).
    mockRoute.query = { category: 'b' };
    await flushPromises();

    expect(listTags).toHaveBeenCalledWith('b');
  });

  it('re-fetches unscoped tag options when the category is cleared', async () => {
    await mountCatalogue({ category: 'a' });
    listTags.mockClear();

    mockRoute.query = {};
    await flushPromises();

    expect(listTags).toHaveBeenCalledWith(undefined);
  });
});
