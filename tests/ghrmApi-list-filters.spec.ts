/**
 * ghrmApi list filters — the catalogue talks to GET /api/v1/ghrm/packages with
 * the new `kind` and `tags` filter params (tags are comma-joined, AND-semantics
 * on the backend), and reads the tag filter options from GET /api/v1/ghrm/tags.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ghrmApi } from '../src/api/ghrmApi';

type FetchMock = { mock: { calls: unknown[][] } };

function stubFetch(payload: unknown): FetchMock {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => payload,
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock as unknown as FetchMock;
}

function calledUrl(fetchMock: FetchMock): string {
  return fetchMock.mock.calls[0][0] as string;
}

describe('ghrmApi.listPackages — kind + tags serialization', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serializes tags: ["a","b"] to a comma-joined tags param', async () => {
    const fetchMock = stubFetch({ items: [], total: 0, page: 1, per_page: 12, pages: 1 });

    await ghrmApi.listPackages({ page: '1', tags: ['a', 'b'], kind: 'bundle' });

    const url = calledUrl(fetchMock);
    expect(url).toContain('tags=a%2Cb');
    expect(url).toContain('kind=bundle');
    expect(url).toContain('page=1');
  });

  it('omits tags and kind when empty / absent', async () => {
    const fetchMock = stubFetch({ items: [], total: 0, page: 1, per_page: 12, pages: 1 });

    await ghrmApi.listPackages({ page: '1', tags: [] });

    const url = calledUrl(fetchMock);
    expect(url).not.toContain('tags=');
    expect(url).not.toContain('kind=');
  });

  it('still forwards plain string params (category_slug, q, per_page)', async () => {
    const fetchMock = stubFetch({ items: [], total: 0, page: 1, per_page: 12, pages: 1 });

    await ghrmApi.listPackages({ category_slug: 'tools', q: 'grep', per_page: '20' });

    const url = calledUrl(fetchMock);
    expect(url).toContain('category_slug=tools');
    expect(url).toContain('q=grep');
    expect(url).toContain('per_page=20');
  });
});

describe('ghrmApi.listTags', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hits /api/v1/ghrm/tags and returns the tags array', async () => {
    const fetchMock = stubFetch({ tags: [{ slug: 'cli', name: 'CLI' }] });

    const tags = await ghrmApi.listTags();

    expect(calledUrl(fetchMock)).toBe('/api/v1/ghrm/tags');
    expect(tags).toEqual([{ slug: 'cli', name: 'CLI' }]);
  });

  it('scopes to a category via the category_slug param', async () => {
    const fetchMock = stubFetch({ tags: [{ slug: 'cli', name: 'CLI' }] });

    await ghrmApi.listTags('tools');

    expect(calledUrl(fetchMock)).toBe('/api/v1/ghrm/tags?category_slug=tools');
  });
});
