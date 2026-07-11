<template>
  <div class="ghrm-catalogue">
    <div class="ghrm-list-header">
      <h1 class="ghrm-list-title">
        {{ $t('ghrm.title') }}
      </h1>
      <div class="ghrm-list-controls">
        <input
          v-model="searchQ"
          class="ghrm-search-input"
          type="text"
          data-testid="ghrm-search-input"
          :placeholder="$t('ghrm.search')"
          @input="onSearchInput"
        >
        <button
          class="ghrm-view-toggle"
          type="button"
          :title="viewMode === 'grid' ? 'Switch to list' : 'Switch to grid'"
          @click="viewMode = viewMode === 'grid' ? 'list' : 'grid'"
        >
          {{ viewMode === 'grid' ? '☰' : '⊞' }}
        </button>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="ghrm-filters">
      <label class="ghrm-filter-field">
        <span class="ghrm-filter-label">{{ $t('ghrm.filterCategory') }}</span>
        <select
          class="ghrm-filter-select"
          data-testid="ghrm-filter-category"
          :value="activeCategory"
          @change="onCategoryChange"
        >
          <option value="">
            {{ $t('ghrm.allCategories') }}
          </option>
          <option
            v-for="cat in store.categoryOptions"
            :key="cat.slug"
            :value="cat.slug"
          >
            {{ cat.label }}
          </option>
        </select>
      </label>

      <div class="ghrm-filter-field">
        <span class="ghrm-filter-label">{{ $t('ghrm.filterKind') }}</span>
        <div
          class="ghrm-kind-toggle"
          role="group"
        >
          <button
            v-for="option in kindOptions"
            :key="option.value || 'all'"
            type="button"
            class="ghrm-kind-btn"
            :class="{ 'ghrm-kind-btn--active': activeKind === option.value }"
            :data-testid="`ghrm-kind-${option.value || 'all'}`"
            @click="setKind(option.value)"
          >
            {{ $t(option.labelKey) }}
          </button>
        </div>
      </div>

      <div
        v-if="store.tagOptions.length"
        class="ghrm-filter-field ghrm-filter-field--tags"
      >
        <span class="ghrm-filter-label">{{ $t('ghrm.filterTags') }}</span>
        <div class="ghrm-tag-toggle">
          <button
            v-for="tag in store.tagOptions"
            :key="tag.slug"
            type="button"
            class="ghrm-tag-chip"
            :class="{ 'ghrm-tag-chip--active': activeTags.includes(tag.slug) }"
            :data-testid="`ghrm-tag-${tag.slug}`"
            @click="toggleTag(tag.slug)"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Active filters summary -->
    <div
      v-if="hasActiveFilters"
      class="ghrm-active-filters"
    >
      <span class="ghrm-active-filters__label">{{ $t('ghrm.activeFilters') }}</span>
      <button
        type="button"
        class="ghrm-clear-filters"
        data-testid="ghrm-clear-filters"
        @click="clearFilters"
      >
        {{ $t('ghrm.clearFilters') }}
      </button>
    </div>

    <div
      v-if="store.loading"
      class="ghrm-loading"
    >
      Loading...
    </div>
    <div
      v-else-if="store.error"
      class="ghrm-error"
    >
      {{ store.error }}
    </div>
    <div
      v-else-if="!items.length"
      class="ghrm-empty"
    >
      <p>{{ $t('ghrm.noPackages') }}</p>
      <button
        v-if="hasActiveFilters"
        type="button"
        class="ghrm-clear-filters"
        data-testid="ghrm-empty-clear-filters"
        @click="clearFilters"
      >
        {{ $t('ghrm.clearFilters') }}
      </button>
    </div>
    <div
      v-else
      :class="viewMode === 'grid' ? 'ghrm-grid' : 'ghrm-list'"
    >
      <router-link
        v-for="pkg in items"
        :key="pkg.id"
        :to="`${catalogueBase()}/${pkg.slug}`"
        :class="viewMode === 'grid' ? 'ghrm-pkg-card' : 'ghrm-pkg-row'"
      >
        <img
          v-if="pkg.icon_url"
          :src="pkg.icon_url"
          :alt="pkg.name"
          class="ghrm-pkg-icon"
        >
        <div class="ghrm-pkg-info">
          <span
            class="ghrm-pkg-badge"
            :class="pkg.package_kind === 'bundle' ? 'ghrm-pkg-badge--bundle' : 'ghrm-pkg-badge--single'"
          >
            <svg
              v-if="pkg.package_kind === 'bundle'"
              class="ghrm-pkg-badge__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
              <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
              <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
            </svg>
            <svg
              v-else
              class="ghrm-pkg-badge__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="M3.29 7 12 12l8.71-5" />
              <path d="M12 22V12" />
            </svg>
            {{ pkg.package_kind === 'bundle' ? $t('ghrm.bundle') : $t('ghrm.singlePackage') }}
          </span>
          <span class="ghrm-pkg-name">{{ pkg.name }}</span>
          <span
            v-if="pkg.author_name"
            class="ghrm-pkg-author"
          >{{ $t('ghrm.by') }} {{ pkg.author_name }}</span>
          <div
            v-if="pkg.tags && pkg.tags.length"
            class="ghrm-pkg-tags"
          >
            <button
              v-for="tag in pkg.tags"
              :key="tag"
              type="button"
              class="ghrm-pkg-tag"
              :class="{ 'ghrm-pkg-tag--active': activeTags.includes(tag) }"
              @click.stop.prevent="toggleTag(tag)"
            >
              {{ tagLabel(tag) }}
            </button>
          </div>
        </div>
        <span class="ghrm-pkg-downloads">↓ {{ pkg.download_counter }}</span>
      </router-link>
    </div>

    <div
      v-if="totalPages > 1"
      class="ghrm-pagination"
    >
      <button
        type="button"
        :disabled="currentPage <= 1"
        @click="goPage(currentPage - 1)"
      >
        ←
      </button>
      <span>{{ currentPage }} / {{ totalPages }}</span>
      <button
        type="button"
        :disabled="currentPage >= totalPages"
        @click="goPage(currentPage + 1)"
      >
        →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGhrmStore } from '../stores/useGhrmStore';
import { type GhrmListParams } from '../api/ghrmApi';
import { catalogueBase } from '../catalogueBase';

// The CMS vue-component widget renderer spreads the seeded `content_json.props`
// onto this component, so the operator-configured page size arrives as a prop.
const props = defineProps<{ items_per_page?: number }>();

const route = useRoute();
const router = useRouter();
const store = useGhrmStore();

const DEFAULT_PER_PAGE = 12;
const SEARCH_DEBOUNCE_MS = 300;

const kindOptions: { value: '' | 'single' | 'bundle'; labelKey: string }[] = [
  { value: '', labelKey: 'ghrm.kindAll' },
  { value: 'single', labelKey: 'ghrm.kindSingle' },
  { value: 'bundle', labelKey: 'ghrm.kindBundle' },
];

const viewMode = ref<'grid' | 'list'>('grid');
// Local mirror of the URL `q` — the input debounces before pushing to the URL.
const searchQ = ref((route.query.q as string) || '');

const perPage = computed(() => String(props.items_per_page ?? DEFAULT_PER_PAGE));

// All filter state is derived from the URL query — the single source of truth
// so results are shareable, bookmarkable and back/forward correct.
const activeCategory = computed(() => (route.query.category as string) || '');
const activeKind = computed(() => (route.query.kind as string) || '');
const activeTags = computed(() => parseTags(route.query.tags as string | undefined));
const currentPage = computed(() => Number(route.query.page) || 1);

const items = computed(() => store.packages?.items || []);
const totalPages = computed(() => store.packages?.pages || 1);
const hasActiveFilters = computed(
  () => !!(activeCategory.value || activeKind.value || activeTags.value.length || (route.query.q as string)),
);

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((slug) => slug.trim()).filter(Boolean);
}

function tagLabel(slug: string): string {
  return store.tagOptions.find((tag) => tag.slug === slug)?.name ?? slug;
}

// Merge a patch onto the current query. Empty/undefined values remove the key.
// Any filter change resets pagination to page 1 unless `resetPage` is false.
function pushFilters(patch: Record<string, string | undefined>, resetPage = true) {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(route.query)) {
    if (typeof value === 'string') next[key] = value;
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === '') delete next[key];
    else next[key] = value;
  }
  if (resetPage) delete next.page;
  router.push({ path: route.path, query: next });
}

function onCategoryChange(event: Event) {
  setCategory((event.target as HTMLSelectElement).value);
}

function setCategory(slug: string) {
  pushFilters({ category: slug || undefined });
}

function setKind(kind: '' | 'single' | 'bundle') {
  pushFilters({ kind: kind || undefined });
}

function toggleTag(slug: string) {
  const next = activeTags.value.includes(slug)
    ? activeTags.value.filter((tag) => tag !== slug)
    : [...activeTags.value, slug];
  pushFilters({ tags: next.length ? next.join(',') : undefined });
}

let searchTimer: ReturnType<typeof setTimeout>;
function onSearchInput() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => pushFilters({ q: searchQ.value || undefined }), SEARCH_DEBOUNCE_MS);
}

function clearFilters() {
  searchQ.value = '';
  router.push({ path: route.path, query: {} });
}

function goPage(page: number) {
  pushFilters({ page: page > 1 ? String(page) : undefined }, false);
}

function loadPackages() {
  const params: GhrmListParams = {
    page: String(currentPage.value),
    per_page: perPage.value,
  };
  if (activeCategory.value) params.category_slug = activeCategory.value;
  if (activeTags.value.length) params.tags = activeTags.value;
  if (activeKind.value) params.kind = activeKind.value as 'single' | 'bundle';
  const searchValue = (route.query.q as string) || '';
  if (searchValue) params.q = searchValue;
  store.fetchPackages(params);
}

onMounted(() => {
  store.fetchCategoryOptions();
  // Tag options are scoped to the category in the URL on first load; when no
  // category is selected they fall back to the unscoped set.
  store.fetchTagOptions(activeCategory.value || undefined);
  loadPackages();
});

// React to any URL change (filters, pagination, back/forward) — the URL is the
// single source of truth. Refetch packages and keep the search input mirror in
// sync.
watch(
  () => route.query,
  () => {
    searchQ.value = (route.query.q as string) || '';
    loadPackages();
  },
  { deep: true },
);

// Re-fetch the tag-filter options whenever the active category changes so the
// offered tags mirror what the currently-selected category can show; clearing
// the category refetches the unscoped set. A tag still selected in the URL but
// absent from the new options simply isn't rendered — results stay filtered
// server-side, so no crash and no stale chip.
watch(activeCategory, (categorySlug) => {
  store.fetchTagOptions(categorySlug || undefined);
});
</script>

<style scoped>
.ghrm-catalogue { max-width: 1100px; margin: 0 auto; padding: 20px; }
.ghrm-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.ghrm-list-title { font-size: 1.6rem; color: var(--color-heading, #2c3e50); margin: 0; }
.ghrm-list-controls { display: flex; gap: 8px; align-items: center; }
.ghrm-search-input { padding: 8px 12px; border: 1px solid var(--color-border, #d1d5db); border-radius: 6px; font-size: 14px; width: 200px; max-width: 100%; background: var(--color-surface, #fff); color: var(--color-text, #333); }
.ghrm-view-toggle { padding: 8px 12px; border: 1px solid var(--color-border, #d1d5db); border-radius: 6px; background: var(--color-surface, #fff); color: var(--color-text, #333); cursor: pointer; font-size: 18px; }

/* Filter bar */
.ghrm-filters { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 16px 24px; padding: 16px; margin-bottom: 16px; background: var(--color-surface-muted, #f8f9fa); border: 1px solid var(--color-border, #e9ecef); border-radius: 10px; }
.ghrm-filter-field { display: flex; flex-direction: column; gap: 6px; }
.ghrm-filter-field--tags { flex: 1 1 100%; }
.ghrm-filter-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted, #6b7280); }
.ghrm-filter-select { padding: 8px 12px; border: 1px solid var(--color-border, #d1d5db); border-radius: 6px; font-size: 14px; background: var(--color-surface, #fff); color: var(--color-text, #333); min-width: 180px; }
.ghrm-kind-toggle { display: inline-flex; border: 1px solid var(--color-border, #d1d5db); border-radius: 6px; overflow: hidden; }
.ghrm-kind-btn { padding: 8px 14px; background: var(--color-surface, #fff); color: var(--color-text, #374151); border: none; border-right: 1px solid var(--color-border, #d1d5db); cursor: pointer; font-size: 13px; }
.ghrm-kind-btn:last-child { border-right: none; }
.ghrm-kind-btn--active { background: var(--color-primary, #3498db); color: var(--color-on-primary, #fff); }
.ghrm-tag-toggle { display: flex; flex-wrap: wrap; gap: 8px; }
.ghrm-tag-chip { padding: 5px 12px; border: 1px solid var(--color-border, #d1d5db); border-radius: 999px; background: var(--color-surface, #fff); color: var(--color-text, #374151); cursor: pointer; font-size: 12px; }
.ghrm-tag-chip--active { background: var(--color-primary, #3498db); color: var(--color-on-primary, #fff); border-color: var(--color-primary, #3498db); }

/* Active filters summary */
.ghrm-active-filters { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.ghrm-active-filters__label { font-size: 13px; color: var(--color-text-muted, #6b7280); }
.ghrm-clear-filters { padding: 6px 14px; border: 1px solid var(--color-border, #d1d5db); border-radius: 6px; background: var(--color-surface, #fff); color: var(--color-primary, #3498db); cursor: pointer; font-size: 13px; }
.ghrm-clear-filters:hover { border-color: var(--color-primary, #3498db); }

.ghrm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.ghrm-list { display: flex; flex-direction: column; gap: 8px; }
.ghrm-pkg-card { display: flex; flex-direction: column; gap: 8px; padding: 20px; background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e9ecef); border-radius: 8px; text-decoration: none; transition: all .2s; }
.ghrm-pkg-card:hover { border-color: var(--color-primary, #3498db); box-shadow: 0 2px 12px rgba(52,152,219,.1); }
.ghrm-pkg-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e9ecef); border-radius: 6px; text-decoration: none; }
.ghrm-pkg-row:hover { background: var(--color-surface-hover, #f0f7ff); }
.ghrm-pkg-icon { width: 40px; height: 40px; object-fit: contain; border-radius: 6px; }
.ghrm-pkg-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.ghrm-pkg-badge { align-self: flex-start; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; margin-bottom: 4px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1.5; letter-spacing: .01em; }
.ghrm-pkg-badge__icon { width: 12px; height: 12px; flex-shrink: 0; }
.ghrm-pkg-badge--bundle { background: #ede9fe; color: #6d28d9; }
.ghrm-pkg-badge--single { background: #eff6ff; color: #2563eb; }
.ghrm-pkg-name { font-weight: 600; color: var(--color-heading, #2c3e50); font-size: 15px; }
.ghrm-pkg-author { font-size: 12px; color: var(--color-text-muted, #6b7280); }
.ghrm-pkg-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.ghrm-pkg-tag { padding: 2px 8px; border: 1px solid var(--color-border, #e9ecef); border-radius: 999px; background: var(--color-surface-muted, #f8f9fa); color: var(--color-text-muted, #6b7280); cursor: pointer; font-size: 11px; }
.ghrm-pkg-tag--active { background: var(--color-primary, #3498db); color: var(--color-on-primary, #fff); border-color: var(--color-primary, #3498db); }
.ghrm-pkg-downloads { font-size: 12px; color: var(--color-text-muted, #9ca3af); }
.ghrm-pagination { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 24px; }
.ghrm-pagination button { padding: 6px 14px; border: 1px solid var(--color-border, #d1d5db); border-radius: 4px; background: var(--color-surface, #fff); color: var(--color-text, #333); cursor: pointer; }
.ghrm-pagination button:disabled { opacity: .4; cursor: default; }
.ghrm-loading, .ghrm-error, .ghrm-empty { text-align: center; padding: 48px 20px; color: var(--color-text-muted, #6b7280); }
.ghrm-empty { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.ghrm-error { color: #dc2626; }

@media (max-width: 640px) {
  .ghrm-filters { flex-direction: column; gap: 14px; }
  .ghrm-filter-field, .ghrm-filter-select, .ghrm-kind-toggle { width: 100%; }
  .ghrm-kind-btn { flex: 1; }
  .ghrm-search-input { width: 100%; }
}
</style>
