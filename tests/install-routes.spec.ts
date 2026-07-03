/**
 * The ghrm plugin derives its catalogue route prefix + page slugs from the
 * backend single source of truth (GET /api/v1/ghrm/config) at install time.
 * install() is async: it awaits the config fetch before registering routes,
 * and falls back to /category + ghrm-software-detail if the fetch fails.
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

interface CapturedRoute {
  path: string;
  name: string;
  props?: unknown;
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

describe('ghrmPlugin.install — configurable catalogue prefix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCatalogueBase('category');
  });

  it('registers catalogue routes under the backend catalogue_page_slug', async () => {
    mockGetConfig.mockResolvedValue({
      catalogue_page_slug: 'software1',
      detail_page_slug: 'my-detail',
      allow_extensive_github_permissions: false,
    });
    const { sdk, routes } = makeSdk();

    await ghrmPlugin.install!(sdk as never);

    expect(catalogueBase()).toBe('/software1');
    const byName = Object.fromEntries(routes.map((r) => [r.name, r]));
    expect(byName['ghrm-category-index'].path).toBe('/software1');
    expect(byName['ghrm-category-index'].props).toEqual({ slug: 'software1' });
    expect(byName['ghrm-package-list'].path).toBe('/software1/:category_slug');
    expect(byName['ghrm-package-detail'].path).toBe('/software1/:category_slug/:package_slug');
    expect(byName['ghrm-package-detail'].props).toEqual({ slug: 'my-detail' });
    expect(byName['ghrm-search'].path).toBe('/software1/search');
  });

  it('preserves per-category page slug for the list route', async () => {
    mockGetConfig.mockResolvedValue({
      catalogue_page_slug: 'software1',
      detail_page_slug: 'my-detail',
      allow_extensive_github_permissions: false,
    });
    const { sdk, routes } = makeSdk();

    await ghrmPlugin.install!(sdk as never);

    const list = routes.find((r) => r.name === 'ghrm-package-list')!;
    const props = (list.props as (route: { params: Record<string, string> }) => { slug: string })({
      params: { category_slug: 'tools' },
    });
    expect(props).toEqual({ slug: 'software1/tools' });
  });

  it('falls back to /category + ghrm-software-detail when the config fetch fails', async () => {
    mockGetConfig.mockRejectedValue(new Error('network'));
    const { sdk, routes } = makeSdk();

    await ghrmPlugin.install!(sdk as never);

    expect(catalogueBase()).toBe('/category');
    const byName = Object.fromEntries(routes.map((r) => [r.name, r]));
    expect(byName['ghrm-category-index'].path).toBe('/category');
    expect(byName['ghrm-category-index'].props).toEqual({ slug: 'category' });
    expect(byName['ghrm-package-detail'].props).toEqual({ slug: 'ghrm-software-detail' });
  });
});
