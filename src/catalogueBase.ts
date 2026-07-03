/**
 * Shared holder for the catalogue URL prefix so that the route registrations
 * (index.ts) and the widget links agree on where the catalogue lives.
 *
 * The value is derived from the backend single source of truth
 * (GET /api/v1/ghrm/config → `catalogue_page_slug`) at install time. Until the
 * config fetch resolves it defaults to `/category`.
 */
const DEFAULT_CATALOGUE_BASE = '/category';

let resolvedCatalogueBase = DEFAULT_CATALOGUE_BASE;

/** The catalogue base URL prefix — always a leading slash, never a trailing one. */
export function catalogueBase(): string {
  return resolvedCatalogueBase;
}

/** Set the catalogue base from a backend page slug (e.g. `category`, `software1`). */
export function setCatalogueBase(pageSlug: string): void {
  const trimmed = pageSlug.replace(/^\/+/, '').replace(/\/+$/, '');
  resolvedCatalogueBase = trimmed ? `/${trimmed}` : DEFAULT_CATALOGUE_BASE;
}
