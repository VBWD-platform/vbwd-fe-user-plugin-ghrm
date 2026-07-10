/**
 * The ghrm plugin derives its catalogue route prefix + page slugs from the
 * backend single source of truth (GET /api/v1/ghrm/config) at install time.
 *
 * The catalogue is now a SINGLE page whose widget carries the filters, so the
 * route table is flat:
 *   base                    → CmsPage(catalogue_page_slug)   name ghrm-catalogue
 *   base/search             → GhrmSearch.vue                  name ghrm-search
 *   base/:package_slug      → CmsPage(detail_page_slug)       name ghrm-package-detail
 * The old per-category list route (base/:category_slug) is gone. Legacy
 * /category* URLs are preserved via redirect routes (unless base IS /category,
 * which would self-redirect).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetConfig = vi.fn();

vi.mock('../src/api/ghrmApi', () => ({
  ghrmApi: {
    getConfig: (...args: unknown[]) => mockGetConfig(...args),
    getPackageByPlan: vi.fn(),
  },
}));

// Stub the heavy view/component modules + host registries so install() can run
// in isolation without pulling the whole app graph.
vi.mock('../../cms/src/views/CmsPage.vue', () => ({ default: {} }));
vi.mock('../src/views/GhrmCatalogueContent.vue', () => ({ default: {} }));
vi.mock('../src/views/GhrmPackageDetail.vue', () => ({ default: {} }));
vi.mock('../src/views/GhrmSearch.vue', () => ({ default: {} }));
vi.mock('../src/views/GhrmOAuthCallback.vue', () => ({ default: {} }));
vi.mock('../src/components/GhrmCheckoutContext.vue', () => ({ default: {} }));
vi.mock('../src/components/GhrmPlanSoftwareTab.vue', () => ({ default: {} }));
vi.mock('../src/components/GhrmPlanGithubAccessTab.vue', () => ({ default: {} }));
vi.mock('../../cms/src/registry/vueComponentRegistry', () => ({
  registerCmsVueComponent: vi.fn(),
}));
vi.mock('@/plugins/userNavRegistry', () => ({
  userNavRegistry: { register: vi.fn(), unregister: vi.fn() },
}));
vi.mock('@/registries/checkoutContextRegistry', () => ({
  checkoutContextRegistry: { register: vi.fn(), unregister: vi.fn() },
}));
vi.mock('@/utils/planDetailTabRegistry', () => ({
  planDetailTabRegistry: { register: vi.fn() },
}));

import { ghrmPlugin } from '../index';
import { catalogueBase, setCatalogueBase } from '../src/catalogueBase';

type RedirectFn = (to: { params: Record<string, string> }) => unknown;

interface CapturedRoute {
  path: string;
  name: string;
  props?: unknown;
  redirect?: string | RedirectFn;
}

function makeSdk() {
  const routes: CapturedRoute[] = [];
  return {
    routes,
    sdk: {
      addTranslations: vi.fn(),
      addRoute: (route: CapturedRoute) => routes.push(route),
    },
  };
}

async function installWith(config: {
  catalogue_page_slug: string;
  detail_page_slug: string;
}) {
  mockGetConfig.mockResolvedValue({ ...config, allow_extensive_github_permissions: false });
  const { sdk, routes } = makeSdk();
  await ghrmPlugin.install!(sdk as never);
  return { routes, byName: Object.fromEntries(routes.map((r) => [r.name, r])) };
}

describe('ghrmPlugin.install — flat catalogue route table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCatalogueBase('software');
  });

  it('registers a single catalogue page, search, and a detail route (no category segment)', async () => {
    const { byName } = await installWith({
      catalogue_page_slug: 'software',
      detail_page_slug: 'ghrm-software-detail',
    });

    expect(catalogueBase()).toBe('/software');
    expect(byName['ghrm-catalogue'].path).toBe('/software');
    expect(byName['ghrm-catalogue'].props).toEqual({ slug: 'software' });

    expect(byName['ghrm-search'].path).toBe('/software/search');

    expect(byName['ghrm-package-detail'].path).toBe('/software/:package_slug');
    expect(byName['ghrm-package-detail'].props).toEqual({ slug: 'ghrm-software-detail' });
  });

  it('does NOT register a per-category list route', async () => {
    const { routes, byName } = await installWith({
      catalogue_page_slug: 'software',
      detail_page_slug: 'ghrm-software-detail',
    });

    expect(byName['ghrm-package-list']).toBeUndefined();
    expect(routes.some((r) => r.path === '/software/:category_slug')).toBe(false);
  });

  it('registers search BEFORE the :package_slug param route', async () => {
    const { routes } = await installWith({
      catalogue_page_slug: 'software',
      detail_page_slug: 'ghrm-software-detail',
    });

    const searchIndex = routes.findIndex((r) => r.name === 'ghrm-search');
    const detailIndex = routes.findIndex((r) => r.name === 'ghrm-package-detail');
    expect(searchIndex).toBeGreaterThanOrEqual(0);
    expect(searchIndex).toBeLessThan(detailIndex);
  });

  it('registers legacy /category* redirects that resolve to the new targets', async () => {
    const { routes } = await installWith({
      catalogue_page_slug: 'software',
      detail_page_slug: 'ghrm-software-detail',
    });

    const index = routes.find((r) => r.path === '/category')!;
    expect(index).toBeDefined();
    expect(index.redirect).toBe('/software');

    const list = routes.find((r) => r.path === '/category/:category_slug')!;
    expect(typeof list.redirect).toBe('function');
    expect((list.redirect as RedirectFn)({ params: { category_slug: 'mobile' } })).toEqual({
      path: '/software',
      query: { category: 'mobile' },
    });

    const detail = routes.find((r) => r.path === '/category/:category_slug/:package_slug')!;
    expect(typeof detail.redirect).toBe('function');
    expect((detail.redirect as RedirectFn)({ params: { category_slug: 'mobile', package_slug: 'widget' } })).toEqual({
      path: '/software/widget',
    });
  });

  it('does NOT register /category redirects when the resolved base IS /category (no self-loop)', async () => {
    const { routes } = await installWith({
      catalogue_page_slug: 'category',
      detail_page_slug: 'ghrm-software-detail',
    });

    expect(catalogueBase()).toBe('/category');
    // The only route at exactly /category is the catalogue page itself, not a redirect.
    const atRoot = routes.filter((r) => r.path === '/category');
    expect(atRoot).toHaveLength(1);
    expect(atRoot[0].name).toBe('ghrm-catalogue');
    expect(atRoot[0].redirect).toBeUndefined();
    expect(routes.some((r) => r.path === '/category/:category_slug')).toBe(false);
  });

  it('falls back to /software + ghrm-software-detail when the config fetch fails', async () => {
    mockGetConfig.mockRejectedValue(new Error('network'));
    const { sdk, routes } = makeSdk();

    await ghrmPlugin.install!(sdk as never);

    expect(catalogueBase()).toBe('/software');
    const byName = Object.fromEntries(routes.map((r) => [r.name, r]));
    expect(byName['ghrm-catalogue'].path).toBe('/software');
    expect(byName['ghrm-catalogue'].props).toEqual({ slug: 'software' });
    expect(byName['ghrm-package-detail'].props).toEqual({ slug: 'ghrm-software-detail' });
  });
});
