const API = '/api/v1/ghrm';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const resp = await fetch(url + qs, { headers: authHeaders() });
  if (!resp.ok) throw new Error(`GET ${url} failed: ${resp.status}`);
  return resp.json();
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `POST ${url} failed: ${resp.status}`);
  }
  return resp.json();
}

async function del(url: string): Promise<void> {
  const resp = await fetch(url, { method: 'DELETE', headers: authHeaders() });
  if (!resp.ok) throw new Error(`DELETE ${url} failed: ${resp.status}`);
}

export interface GhrmPackage {
  id: string;
  slug: string;
  name: string;
  tariff_plan_id: string;
  description: string | null;
  author_name: string | null;
  icon_url: string | null;
  github_owner: string;
  github_repo: string;
  github_protected_branch: string;
  download_counter: number;
  readme: string | null;
  changelog: string | null;
  docs: string | null;
  screenshots: { url: string; caption: string }[];
  cached_releases: { tag: string; date: string; notes: string; assets: { name: string; url: string }[] }[];
  latest_version: string | null;
  latest_released_at: string | null;
  last_synced_at: string | null;
  related_slugs: string[];
  features?: string[];
  // S77 — generic core tags / custom fields appended by the backend serializer.
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  custom_field_defs?: import('vbwd-view-component').CustomFieldDef[];
  price?: GhrmPrice | null;
}

export interface GhrmPackageListItem {
  id: string;
  slug: string;
  name: string;
  author_name: string | null;
  icon_url: string | null;
  download_counter: number;
  // The list endpoint does not return latest_version — kept for shape parity
  // with callers that fetch a full package; never rely on it in list views.
  latest_version: string | null;
  package_kind: 'single' | 'bundle';
  tags: string[];
  price: GhrmPrice | null;
}

/** Price block for a package's linked tariff plan (from the core PriceFactory). */
export interface GhrmPrice {
  gross_amount: string;
  net_amount: string;
  billing_period: string | null;
  display_price: number;
  price: { brutto: number; netto: number; currency: string; taxes: unknown[] };
}

/** A catalogue tag filter option (GET /api/v1/ghrm/tags). */
export interface GhrmTag {
  slug: string;
  name: string;
}

/** Query parameters accepted by the catalogue package listing. */
export interface GhrmListParams {
  page?: string;
  per_page?: string;
  category_slug?: string;
  q?: string;
  kind?: 'single' | 'bundle';
  tags?: string[];
}

export interface GhrmPaginated<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export type GhrmMembershipStatus = 'ACTIVE' | 'INVITED' | 'GRACE' | 'REVOKED' | 'ERROR';

export interface GhrmMembershipRepo {
  owner: string;
  repo: string;
  github_url: string;
}

export interface GhrmMembershipTeam {
  org: string;
  slug: string;
  url: string;
}

export interface GhrmMembership {
  package_slug: string;
  package_name: string;
  status: GhrmMembershipStatus;
  invited_at?: string | null;
  grace_expires_at?: string | null;
  invitations_url?: string | null;
  last_error?: string | null;
  // S? access enrichment: every membership self-describes its clone targets so
  // the fe renders a GitHub link + clone guidance without a second fetch.
  access_kind?: 'repo' | 'team';
  repos?: GhrmMembershipRepo[];
  team?: GhrmMembershipTeam | null;
}

export interface GhrmAccessStatus {
  connected: boolean;
  github_username?: string;
  memberships?: GhrmMembership[];
}

export interface GhrmActiveInstall {
  state: 'active';
  package_slug: string;
  github_username: string;
  pat_steps: string[];
  clone_https: string;
  clone_ssh: string;
}

export interface GhrmInvitedInstall {
  state: 'invited';
  package_slug: string;
  message: string;
  invitations_url: string;
}

export type GhrmPackageInstall = GhrmActiveInstall | GhrmInvitedInstall;

export interface GhrmCategory {
  slug: string;
  label: string;
}

export interface GhrmConfig {
  catalogue_page_slug: string;
  detail_page_slug: string;
  allow_extensive_github_permissions: boolean;
}

export const ghrmApi = {
  getConfig(): Promise<GhrmConfig> {
    return get(`${API}/config`);
  },
  getCategories(): Promise<{ categories: GhrmCategory[] }> {
    return get(`${API}/categories`);
  },
  listTags(categorySlug?: string): Promise<GhrmTag[]> {
    const query = categorySlug ? { category_slug: categorySlug } : undefined;
    return get<{ tags: GhrmTag[] }>(`${API}/tags`, query).then((data) => data.tags);
  },
  listPackages(params: GhrmListParams = {}): Promise<GhrmPaginated<GhrmPackageListItem>> {
    const query: Record<string, string> = {};
    if (params.page) query.page = params.page;
    if (params.per_page) query.per_page = params.per_page;
    if (params.category_slug) query.category_slug = params.category_slug;
    if (params.q) query.q = params.q;
    if (params.kind) query.kind = params.kind;
    if (params.tags && params.tags.length) query.tags = params.tags.join(',');
    return get(`${API}/packages`, query);
  },
  getPackage(slug: string): Promise<GhrmPackage> {
    return get(`${API}/packages/${slug}`);
  },
  getRelated(slug: string): Promise<GhrmPackageListItem[]> {
    return get(`${API}/packages/${slug}/related`);
  },
  getVersions(slug: string): Promise<{ tag: string; date: string; notes: string; assets: { name: string; url: string }[] }[]> {
    return get(`${API}/packages/${slug}/versions`);
  },
  getPackageInstall(slug: string): Promise<GhrmPackageInstall> {
    return get(`${API}/packages/${slug}/install`);
  },
  getPackageByPlan(planId: string): Promise<GhrmPackage> {
    return get(`${API}/packages/by-plan/${planId}`)
  },
  getAccessStatus(): Promise<GhrmAccessStatus> {
    return get(`${API}/access`);
  },
  getOAuthUrl(): Promise<{ url: string }> {
    return get(`${API}/auth/github`);
  },
  handleOAuthCallback(code: string, state: string): Promise<GhrmAccessStatus> {
    return post(`${API}/auth/github/callback`, { code, state });
  },
  disconnect(): Promise<void> {
    return del(`${API}/auth/github`);
  },
};
