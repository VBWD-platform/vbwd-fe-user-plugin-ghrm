/**
 * S77 — the GHRM package detail renders tags + custom fields from the
 * serialized payload via the shared fe-core read-only display components.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { TagChips, CustomFieldsDisplay } from 'vbwd-view-component';

// The package detail resolves the auth store from fe-core's bundled pinia
// instance (a separate module copy), which the test's setActivePinia does not
// reach — stub it so the component mounts under the test harness.
vi.mock('vbwd-view-component', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('vbwd-view-component');
  return { ...actual, useAuthStore: () => ({ isAuthenticated: false, user: null }) };
});

vi.mock('../src/api/ghrmApi', () => ({
  ghrmApi: {
    getWidgets: vi.fn(async () => ({ widgets: [] })),
    getCategories: vi.fn(async () => ({ categories: [] })),
    getPackage: vi.fn(async () => ({})),
    getAccessStatus: vi.fn(async () => ({})),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { category_slug: 'tools', package_slug: 'widget' } }),
  useRouter: () => ({ push: vi.fn() }),
}));

import GhrmPackageDetail from '../src/views/GhrmPackageDetail.vue';
import { useGhrmStore } from '../src/stores/useGhrmStore';
import type { GhrmPackage } from '../src/api/ghrmApi';

const tFallback = (key: string) => key;

function makePackage(overrides: Partial<GhrmPackage>): GhrmPackage {
  return {
    id: 'pkg-1', slug: 'widget', name: 'Widget', tariff_plan_id: 'plan-1',
    description: 'A widget', author_name: 'Acme', icon_url: null,
    github_owner: 'acme', github_repo: 'widget', github_protected_branch: 'release',
    download_counter: 0, readme: null, changelog: null, docs: null, screenshots: [],
    cached_releases: [], latest_version: null, latest_released_at: null, last_synced_at: null,
    related_slugs: [],
    ...overrides,
  };
}

async function mountWith(overrides: Partial<GhrmPackage>) {
  const store = useGhrmStore();
  store.currentPackage = makePackage(overrides);
  vi.spyOn(store, 'fetchPackage').mockResolvedValue(undefined as never);
  vi.spyOn(store, 'fetchRelated').mockResolvedValue(undefined as never);
  vi.spyOn(store, 'fetchVersions').mockResolvedValue(undefined as never);
  vi.spyOn(store, 'fetchAccessStatus').mockResolvedValue(undefined as never);
  const wrapper = mount(GhrmPackageDetail, {
    global: { mocks: { $t: tFallback }, stubs: { RouterLink: RouterLinkStub, GhrmMarkdownRenderer: true, GhrmVersionsTable: true } },
  });
  await flushPromises();
  return wrapper;
}

describe('GhrmPackageDetail — S77 tags + custom fields', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders TagChips + CustomFieldsDisplay from the payload keys', async () => {
    const wrapper = await mountWith({
      tags: ['cli'],
      custom_fields: { license: 'MIT' },
      custom_field_defs: [{ key: 'license', label: 'License', type: 'text' }],
    });

    expect(wrapper.find('[data-testid="package-tags-custom-fields"]').exists()).toBe(true);
    const tagChips = wrapper.findComponent(TagChips);
    expect(tagChips.exists()).toBe(true);
    expect((tagChips.props() as { tags: string[] }).tags).toEqual(['cli']);
    expect(wrapper.findComponent(CustomFieldsDisplay).exists()).toBe(true);
  });

  it('hides the block when there are no tags or custom fields', async () => {
    const wrapper = await mountWith({ tags: [], custom_fields: {} });

    expect(wrapper.find('[data-testid="package-tags-custom-fields"]').exists()).toBe(false);
  });
});
