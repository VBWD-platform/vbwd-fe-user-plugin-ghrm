/**
 * GhrmCatalogueContent is a single filterable catalogue page. All filter state
 * lives in the URL query (?category=&tags=a,b&kind=bundle&q=&page=) so results
 * are shareable, bookmarkable and back-button-correct. This suite pins:
 *   - initial state hydrates from route.query
 *   - toggling a tag chip pushes the new query and refetches with the right params
 *   - changing a filter resets page to 1
 *   - the kind segmented control maps to the `kind` param
 *   - clear-all empties the query
 *   - empty state renders when there are no items
 *   - the widget's items_per_page reaches the `per_page` request param
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

vi.mock('../src/api/ghrmApi', () => ({
  ghrmApi: {
    getCategories: vi.fn(async () => ({ categories: [{ slug: 'tools', label: 'Tools' }] })),
    listTags: vi.fn(async () => [
      { slug: 'a', name: 'Alpha' },
      { slug: 'b', name: 'Beta' },
    ]),
  },
}));

import GhrmCatalogueContent from '../src/views/GhrmCatalogueContent.vue';
import { useGhrmStore } from '../src/stores/useGhrmStore';

const tFallback = (key: string) => key;

const sampleItem = (over: Record<string, unknown> = {}) => ({
  id: 'x', slug: 's', name: 'N', author_name: 'A', icon_url: null,
  download_counter: 0, latest_version: null, package_kind: 'single', tags: [], ...over,
});

async function mountCatalogue(opts: { query?: Record<string, string>; items?: unknown[]; props?: Record<string, unknown> } = {}) {
  mockRoute.path = '/software';
  mockRoute.query = { ...(opts.query || {}) };
  const store = useGhrmStore();
  const fetchSpy = vi.spyOn(store, 'fetchPackages').mockResolvedValue(undefined as never);
  // @ts-expect-error — partial paginated shape is enough for the list render
  store.packages = { items: opts.items ?? [], pages: 1, total: (opts.items ?? []).length, page: 1, per_page: 12 };
  const wrapper = mount(GhrmCatalogueContent, {
    props: opts.props,
    global: { mocks: { $t: tFallback }, stubs: { RouterLink: RouterLinkStub } },
  });
  await flushPromises();
  return { wrapper, store, fetchSpy };
}

describe('GhrmCatalogueContent — URL-driven filters', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockRouterPush.mockClear();
    mockRoute.query = {};
  });

  it('hydrates the initial fetch from route.query', async () => {
    const { fetchSpy } = await mountCatalogue({
      query: { category: 'tools', tags: 'a,b', kind: 'bundle', q: 'grep', page: '2' },
      items: [sampleItem()],
    });

    expect(fetchSpy).toHaveBeenCalled();
    const params = fetchSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(params.category_slug).toBe('tools');
    expect(params.tags).toEqual(['a', 'b']);
    expect(params.kind).toBe('bundle');
    expect(params.q).toBe('grep');
    expect(params.page).toBe('2');
  });

  it('passes the widget items_per_page prop as per_page (default 12)', async () => {
    const withProp = await mountCatalogue({ props: { items_per_page: 25 }, items: [sampleItem()] });
    expect((withProp.fetchSpy.mock.calls[0][0] as Record<string, unknown>).per_page).toBe('25');

    setActivePinia(createPinia());
    const noProp = await mountCatalogue({ items: [sampleItem()] });
    expect((noProp.fetchSpy.mock.calls[0][0] as Record<string, unknown>).per_page).toBe('12');
  });

  it('toggling a tag chip pushes the new query and refetches with that tag', async () => {
    const { wrapper, fetchSpy } = await mountCatalogue({ items: [sampleItem()] });
    fetchSpy.mockClear();

    await wrapper.get('[data-testid="ghrm-tag-a"]').trigger('click');
    await flushPromises();

    expect(mockRouterPush).toHaveBeenCalled();
    const pushed = mockRouterPush.mock.calls[0][0] as { query: Record<string, string> };
    expect(pushed.query.tags).toBe('a');

    const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
    const params = lastCall[0] as Record<string, unknown>;
    expect(params.tags).toEqual(['a']);
  });

  it('resets page to 1 when a filter changes', async () => {
    const { wrapper } = await mountCatalogue({ query: { page: '3' }, items: [sampleItem()] });

    await wrapper.get('[data-testid="ghrm-tag-b"]').trigger('click');
    await flushPromises();

    const pushed = mockRouterPush.mock.calls[0][0] as { query: Record<string, string> };
    expect(pushed.query.page).toBeUndefined();
  });

  it('kind segmented control maps a click to the kind param', async () => {
    const { wrapper } = await mountCatalogue({ items: [sampleItem()] });

    await wrapper.get('[data-testid="ghrm-kind-bundle"]').trigger('click');
    await flushPromises();

    const pushed = mockRouterPush.mock.calls[0][0] as { query: Record<string, string> };
    expect(pushed.query.kind).toBe('bundle');
  });

  it('clear-all empties the query', async () => {
    const { wrapper } = await mountCatalogue({
      query: { category: 'tools', tags: 'a', kind: 'bundle', q: 'x' },
      items: [sampleItem()],
    });

    await wrapper.get('[data-testid="ghrm-clear-filters"]').trigger('click');
    await flushPromises();

    const pushed = mockRouterPush.mock.calls[0][0] as { query: Record<string, string> };
    expect(pushed.query).toEqual({});
  });

  it('renders the empty state when there are no items', async () => {
    const { wrapper } = await mountCatalogue({ items: [] });
    expect(wrapper.find('.ghrm-empty').exists()).toBe(true);
  });

  it('links each card to the flat detail URL (no category segment)', async () => {
    const { wrapper } = await mountCatalogue({ items: [sampleItem({ slug: 'widget' })] });
    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props('to')).toBe('/software/widget');
  });
});
