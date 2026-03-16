<template>
  <nav
    class="ghrm-breadcrumb"
    aria-label="breadcrumb"
  >
    <component
      :is="'style'"
      v-if="config.css"
    >
      {{ config.css }}
    </component>

    <router-link
      :to="config.root_slug || '/'"
      class="ghrm-breadcrumb__link"
    >
      {{ truncate(config.root_name || 'Home') }}
    </router-link>

    <template v-if="config.show_category !== false && categoryLabel">
      <span
        class="ghrm-breadcrumb__separator"
        aria-hidden="true"
      >{{ config.separator || '/' }}</span>
      <router-link
        v-if="categoryTo"
        :to="categoryTo"
        class="ghrm-breadcrumb__link"
      >
        {{ truncate(categoryLabel) }}
      </router-link>
      <span
        v-else
        class="ghrm-breadcrumb__current"
      >{{ truncate(categoryLabel) }}</span>
    </template>

    <template v-if="packageName">
      <span
        class="ghrm-breadcrumb__separator"
        aria-hidden="true"
      >{{ config.separator || '/' }}</span>
      <span class="ghrm-breadcrumb__current">{{ truncate(packageName) }}</span>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface BreadcrumbConfig {
  separator?: string;
  root_name?: string;
  root_slug?: string;
  show_category?: boolean;
  max_label_length?: number;
  css?: string;
}

interface Props {
  config: BreadcrumbConfig;
  categoryLabel?: string;
  categoryTo?: string;
  packageName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  categoryLabel: undefined,
  categoryTo: undefined,
  packageName: undefined,
});

const maxLen = computed(() => props.config.max_label_length ?? 40);

function truncate(label: string): string {
  if (!label) return '';
  return label.length > maxLen.value ? label.slice(0, maxLen.value) + '…' : label;
}
</script>
