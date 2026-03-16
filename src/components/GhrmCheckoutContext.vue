<template>
  <div
    v-if="packageName"
    class="ghrm-checkout-context card"
  >
    <span class="ghrm-checkout-context__label">{{ $t('ghrm.accessingPackage') }}</span>
    <strong class="ghrm-checkout-context__name">{{ packageName }}</strong>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const packageName = computed(() => route.query.package_name as string || '');
</script>

<style scoped>
.ghrm-checkout-context {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #e8f4fd;
  border: 1px solid #bee3f8;
  padding: 14px 20px;
}
.ghrm-checkout-context__label { color: #2b6cb0; font-size: 14px; }
.ghrm-checkout-context__name { color: #1a365d; font-size: 15px; }
</style>
