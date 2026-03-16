<template>
  <div class="ghrm-plan-software-tab">
    <div
      v-if="loading"
      class="ghrm-loading"
    >
      Loading...
    </div>
    <div
      v-else-if="notFound"
      class="ghrm-muted"
      data-testid="no-package-message"
    >
      No software package is attached to this plan.
    </div>
    <template v-else-if="pkg">
      <!-- Sub-tabs: same 5 as GhrmPackageDetail -->
      <div class="ghrm-tabs">
        <div class="ghrm-tabs__bar">
          <button
            v-for="tab in subTabs"
            :key="tab.id"
            class="ghrm-tabs__tab"
            :class="{ 'ghrm-tabs__tab--active': activeSubTab === tab.id }"
            @click="activeSubTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="ghrm-tabs__panel">
          <template v-if="activeSubTab === 'overview'">
            <GhrmMarkdownRenderer
              v-if="pkg.readme"
              :content="pkg.readme"
            />
            <p
              v-else
              class="ghrm-muted"
            >
              No overview available.
            </p>
          </template>

          <template v-else-if="activeSubTab === 'screenshots'">
            <div
              v-if="pkg.screenshots && pkg.screenshots.length"
              class="ghrm-screenshots"
            >
              <div
                v-for="(s, i) in pkg.screenshots"
                :key="i"
                class="ghrm-screenshot"
              >
                <img
                  :src="s.url"
                  :alt="s.caption || `Screenshot ${i + 1}`"
                  class="ghrm-screenshot-img"
                >
                <p
                  v-if="s.caption"
                  class="ghrm-screenshot-caption"
                >
                  {{ s.caption }}
                </p>
              </div>
            </div>
            <p
              v-else
              class="ghrm-muted"
            >
              No screenshots available.
            </p>
          </template>

          <template v-else-if="activeSubTab === 'changelog'">
            <GhrmMarkdownRenderer
              v-if="pkg.changelog"
              :content="pkg.changelog"
            />
            <p
              v-else
              class="ghrm-muted"
            >
              No changelog available.
            </p>
          </template>

          <template v-else-if="activeSubTab === 'docs'">
            <GhrmMarkdownRenderer
              v-if="pkg.docs"
              :content="pkg.docs"
            />
            <p
              v-else
              class="ghrm-muted"
            >
              No documentation available.
            </p>
          </template>

          <template v-else-if="activeSubTab === 'versions'">
            <GhrmVersionsTable :versions="store.versions" />
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ghrmApi } from '../api/ghrmApi';
import { useGhrmStore } from '../stores/useGhrmStore';
import GhrmMarkdownRenderer from './GhrmMarkdownRenderer.vue';
import GhrmVersionsTable from './GhrmVersionsTable.vue';

const props = defineProps<{ planSlug: string; planId: string }>();

const store = useGhrmStore();
const loading = ref(true);
const notFound = ref(false);
const pkg = ref(store.currentPackage);

const activeSubTab = ref('overview');
const subTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'screenshots', label: 'Screenshots' },
  { id: 'changelog', label: 'Changelog' },
  { id: 'docs', label: 'Documentation' },
  { id: 'versions', label: 'Versions' },
];

onMounted(async () => {
  loading.value = true;
  notFound.value = false;
  try {
    const packageData = await ghrmApi.getPackageByPlan(props.planId);
    const slug = packageData.slug;
    await Promise.all([
      store.fetchPackage(slug),
      store.fetchVersions(slug),
    ]);
    pkg.value = store.currentPackage;
  } catch {
    notFound.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.ghrm-plan-software-tab { }
.ghrm-tabs { border: 1px solid var(--vbwd-border-color, #e9ecef); border-radius: 8px; overflow: hidden; }
.ghrm-tabs__bar { display: flex; background: var(--vbwd-card-bg, #f8f9fa); border-bottom: 1px solid var(--vbwd-border-color, #e9ecef); overflow-x: auto; }
.ghrm-tabs__tab { padding: 10px 16px; background: none; border: none; border-right: 1px solid var(--vbwd-border-light, #eee); cursor: pointer; font-size: 13px; color: var(--vbwd-text-body, #555); white-space: nowrap; }
.ghrm-tabs__tab:hover { background: var(--vbwd-border-light, #f0f0f0); }
.ghrm-tabs__tab--active { background: var(--vbwd-card-bg, #fff); color: var(--vbwd-text-heading, #2c3e50); font-weight: 600; border-bottom: 2px solid var(--vbwd-color-primary, #3498db); margin-bottom: -1px; }
.ghrm-tabs__panel { padding: 20px; background: var(--vbwd-card-bg, #fff); min-height: 160px; }
.ghrm-screenshots { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.ghrm-screenshot-img { width: 100%; border-radius: 6px; border: 1px solid var(--vbwd-border-color, #e9ecef); }
.ghrm-screenshot-caption { font-size: 12px; color: var(--vbwd-text-muted, #6b7280); margin: 4px 0 0; text-align: center; }
.ghrm-muted { color: var(--vbwd-text-muted, #9ca3af); font-style: italic; padding: 20px 0; }
.ghrm-loading { text-align: center; padding: 40px; color: var(--vbwd-text-muted, #6b7280); }
</style>
