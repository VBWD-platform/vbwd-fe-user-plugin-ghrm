/**
 * catalogueBase — single shared holder for the catalogue URL prefix so that
 * routes (index.ts) and widget links agree. Derived from the backend
 * ghrm config `catalogue_page_slug` (single source of truth); defaults to
 * `/category` before the config fetch resolves.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { catalogueBase, setCatalogueBase } from '../src/catalogueBase';

describe('catalogueBase', () => {
  beforeEach(() => {
    // Reset to the documented default before each case.
    setCatalogueBase('category');
  });

  it('defaults to /category', () => {
    setCatalogueBase('category');
    expect(catalogueBase()).toBe('/category');
  });

  it('updates from a page slug (prepends a leading slash)', () => {
    setCatalogueBase('software1');
    expect(catalogueBase()).toBe('/software1');
  });

  it('strips a trailing slash from the page slug', () => {
    setCatalogueBase('software1/');
    expect(catalogueBase()).toBe('/software1');
  });

  it('does not double the leading slash when the slug already has one', () => {
    setCatalogueBase('/software1');
    expect(catalogueBase()).toBe('/software1');
  });
});
