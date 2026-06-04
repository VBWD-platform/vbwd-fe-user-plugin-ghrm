import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ghrmApi, type GhrmPackage, type GhrmPackageListItem, type GhrmPaginated, type GhrmPackageInstall, type GhrmAccessStatus, type GhrmMembership } from '../api/ghrmApi';

export const useGhrmStore = defineStore('ghrm', () => {
  const packages = ref<GhrmPaginated<GhrmPackageListItem> | null>(null);
  const currentPackage = ref<GhrmPackage | null>(null);
  const relatedPackages = ref<GhrmPackageListItem[]>([]);
  const versions = ref<{ tag: string; date: string; notes: string; assets: { name: string; url: string }[] }[]>([]);
  const installPayloads = ref<Record<string, GhrmPackageInstall>>({});
  const accessStatus = ref<GhrmAccessStatus | null>(null);
  const searchResults = ref<GhrmPaginated<GhrmPackageListItem> | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchPackages(params: Record<string, string> = {}) {
    loading.value = true;
    error.value = null;
    try {
      packages.value = await ghrmApi.listPackages(params);
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchPackage(slug: string) {
    loading.value = true;
    error.value = null;
    currentPackage.value = null;
    try {
      currentPackage.value = await ghrmApi.getPackage(slug);
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRelated(slug: string) {
    try {
      relatedPackages.value = await ghrmApi.getRelated(slug);
    } catch {
      relatedPackages.value = [];
    }
  }

  async function fetchVersions(slug: string) {
    try {
      versions.value = await ghrmApi.getVersions(slug);
    } catch {
      versions.value = [];
    }
  }

  async function fetchInstall(slug: string) {
    try {
      installPayloads.value = { ...installPayloads.value, [slug]: await ghrmApi.getPackageInstall(slug) };
    } catch {
      const { [slug]: _removed, ...rest } = installPayloads.value;
      installPayloads.value = rest;
    }
  }

  async function fetchAccessStatus() {
    try {
      accessStatus.value = await ghrmApi.getAccessStatus();
    } catch {
      accessStatus.value = { connected: false };
    }
  }

  function membershipFor(slug: string): GhrmMembership | undefined {
    return accessStatus.value?.memberships?.find((membership) => membership.package_slug === slug);
  }

  async function search(query: string, page = 1) {
    loading.value = true;
    error.value = null;
    try {
      searchResults.value = await ghrmApi.listPackages({ q: query, page: String(page) });
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function disconnect() {
    await ghrmApi.disconnect();
    accessStatus.value = { connected: false };
  }

  return {
    packages, currentPackage, relatedPackages, versions,
    installPayloads, accessStatus, searchResults, loading, error,
    fetchPackages, fetchPackage, fetchRelated, fetchVersions,
    fetchInstall, fetchAccessStatus, membershipFor, search, disconnect,
  };
});
