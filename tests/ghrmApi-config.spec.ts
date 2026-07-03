/**
 * ghrmApi.getConfig() reads the backend single source of truth at
 * GET /api/v1/ghrm/config (catalogue + detail page slugs).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ghrmApi } from '../src/api/ghrmApi';

describe('ghrmApi.getConfig', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          catalogue_page_slug: 'category',
          detail_page_slug: 'ghrm-software-detail',
          allow_extensive_github_permissions: false,
        }),
      })),
    );
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hits /api/v1/ghrm/config and returns the parsed config', async () => {
    const cfg = await ghrmApi.getConfig();

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0];
    expect(calledUrl).toBe('/api/v1/ghrm/config');
    expect(cfg).toEqual({
      catalogue_page_slug: 'category',
      detail_page_slug: 'ghrm-software-detail',
      allow_extensive_github_permissions: false,
    });
  });
});
