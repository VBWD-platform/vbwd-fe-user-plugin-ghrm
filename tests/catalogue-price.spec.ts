/**
 * Catalogue cards show the linked plan's price: the gross amount + billing
 * period for a priced package, "Free" for a zero-amount plan, and nothing when
 * the backend sends no price. i18n is exercised through the mocked $t.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reactive } from 'vue';
import { mount, flushPromises, RouterLinkStub, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('vbwd-view-component', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('vbwd-view-component');
  return {
    ...actual,
    useAuthStore: () => ({ isAuthenticated: false, user: null }),
    // deterministic money formatting for the assertion
    formatMoney: (value: number, opts: { currency?: string } = {}) =>
      `${(opts.currency || 'EUR')} ${Number(value).toFixed(2)}`,
  };
});

const mockRoute = reactive({ path: '/software', query: {} as Record<string, string> });
vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../src/api/ghrmApi', () => ({
  ghrmApi: {
    getCategories: vi.fn(async () => ({ categories: [] })),
    listTags: vi.fn(async () => []),
  },
}));

import GhrmCatalogueContent from '../src/views/GhrmCatalogueContent.vue';
import { useGhrmStore } from '../src/stores/useGhrmStore';

const tFallback = (key: string) => key;

function priced(brutto: number, currency = 'EUR', period: string | null = 'YEARLY') {
  return {
    gross_amount: brutto.toFixed(2),
    net_amount: brutto.toFixed(2),
    billing_period: period,
    display_price: brutto,
    price: { brutto, netto: brutto, currency, taxes: [] },
  };
}

const wrappers: VueWrapper[] = [];
async function mountWith(items: Array<Record<string, unknown>>) {
  mockRoute.path = '/software';
  mockRoute.query = {};
  const store = useGhrmStore();
  vi.spyOn(store, 'fetchPackages').mockResolvedValue(undefined as never);
  store.packages = { items: items as never, pages: 1, total: items.length, page: 1, per_page: 12 };
  const wrapper = mount(GhrmCatalogueContent, {
    global: { mocks: { $t: tFallback }, stubs: { RouterLink: RouterLinkStub } },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}

function card(name: string, price: unknown) {
  return {
    id: name, slug: name, name, author_name: 'acme', icon_url: null,
    download_counter: 0, latest_version: null, package_kind: 'single', tags: [], price,
  };
}

describe('GhrmCatalogueContent — price on card', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });
  afterEach(() => {
    while (wrappers.length) wrappers.pop()?.unmount();
  });

  it('renders the gross amount and billing period for a priced package', async () => {
    const wrapper = await mountWith([card('stripe', priced(29.99, 'EUR', 'YEARLY'))]);
    const price = wrapper.find('.ghrm-pkg-price');
    expect(price.exists()).toBe(true);
    expect(price.text()).toContain('EUR 29.99');
    expect(price.text()).toContain('ghrm.perYear'); // period key via mocked $t
  });

  it('renders "Free" for a zero-amount plan', async () => {
    const wrapper = await mountWith([card('bundle', priced(0, 'EUR', 'YEARLY'))]);
    const price = wrapper.find('.ghrm-pkg-price');
    expect(price.exists()).toBe(true);
    expect(price.text()).toContain('ghrm.free');
  });

  it('renders no price element when the package has no price', async () => {
    const wrapper = await mountWith([card('noprice', null)]);
    expect(wrapper.find('.ghrm-pkg-price').exists()).toBe(false);
  });
});
