import type { IPlugin, IPlatformSDK, IRouteConfig } from 'vbwd-view-component';
import { userNavRegistry } from '@/plugins/userNavRegistry';
import { registerCmsVueComponent } from '../cms/src/registry/vueComponentRegistry';
import { checkoutContextRegistry } from '@/registries/checkoutContextRegistry';
import { planDetailTabRegistry } from '@/utils/planDetailTabRegistry';
import { ghrmApi } from './src/api/ghrmApi';
import { catalogueBase, setCatalogueBase } from './src/catalogueBase';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ru from './locales/ru.json';
import th from './locales/th.json';
import zh from './locales/zh.json';

export const ghrmPlugin: IPlugin = {
  name: 'ghrm',
  version: '26.6.1',
  description: 'GitHub Repo Manager — software catalogue with subscription-gated GitHub access',
  dependencies: ['cms', 'checkout'],
  _active: false,

  async install(sdk: IPlatformSDK) {
    sdk.addTranslations('en', en);
    sdk.addTranslations('de', de);
    sdk.addTranslations('es', es);
    sdk.addTranslations('fr', fr);
    sdk.addTranslations('ja', ja);
    sdk.addTranslations('ru', ru);
    sdk.addTranslations('th', th);
    sdk.addTranslations('zh', zh);

    // Register GHRM Vue components into the CMS widget registry
    Promise.all([
      import('./src/views/GhrmCatalogueContent.vue'),
      import('./src/views/GhrmPackageDetail.vue'),
    ]).then(([catalogue, detail]) => {
      registerCmsVueComponent('GhrmCatalogueContent', catalogue.default);
      registerCmsVueComponent('GhrmPackageDetail', detail.default);
    });

    // Inject GHRM context banner into the checkout page (zero coupling — checkout
    // renders whatever component the registry holds, with no GHRM knowledge)
    import('./src/components/GhrmCheckoutContext.vue').then(({ default: component }) => {
      checkoutContextRegistry.register(component);
    });

    // Catalogue URL prefix + CMS page slugs come from the backend single source
    // of truth (GET /api/v1/ghrm/config). Fall back to the documented defaults
    // if the fetch fails — install() must never throw or the app fails to boot.
    let cataloguePageSlug = 'software';
    let detailPageSlug = 'ghrm-software-detail';
    try {
      const config = await ghrmApi.getConfig();
      cataloguePageSlug = config.catalogue_page_slug;
      detailPageSlug = config.detail_page_slug;
    } catch {
      // keep the defaults above
    }
    setCatalogueBase(cataloguePageSlug);
    const base = catalogueBase();

    // The catalogue is a SINGLE page whose widget carries the filters — so the
    // route table is flat: one catalogue page, one search page, one detail page.
    sdk.addRoute({
      path: base,
      name: 'ghrm-catalogue',
      component: () => import('../cms/src/views/CmsPage.vue'),
      props: { slug: cataloguePageSlug },
      meta: { requiresAuth: false, cmsLayout: true },
    });
    // Search MUST be registered before the :package_slug param route so the
    // static /search segment always wins over the dynamic detail match.
    sdk.addRoute({
      path: `${base}/search`,
      name: 'ghrm-search',
      component: () => import('./src/views/GhrmSearch.vue'),
      meta: { requiresAuth: false, cmsLayout: true },
    });
    // Package detail — no category segment; resolves by package slug alone.
    sdk.addRoute({
      path: `${base}/:package_slug`,
      name: 'ghrm-package-detail',
      component: () => import('../cms/src/views/CmsPage.vue'),
      props: { slug: detailPageSlug },
      meta: { requiresAuth: false, cmsLayout: true },
    });

    // Preserve the old indexed /category* URLs via redirects. Skip them when the
    // resolved base IS /category (operator config) — otherwise the /category
    // redirect would self-loop and the /category/:x redirect would collide with
    // the /category/:package_slug detail route.
    if (base !== '/category') {
      const legacyRedirects: IRouteConfig[] = [
        {
          path: '/category',
          name: 'ghrm-legacy-category-index',
          redirect: base,
        } as unknown as IRouteConfig,
        {
          path: '/category/:category_slug',
          name: 'ghrm-legacy-category-list',
          redirect: (to: { params: Record<string, string> }) => ({
            path: base,
            query: { category: to.params.category_slug },
          }),
        } as unknown as IRouteConfig,
        {
          path: '/category/:category_slug/:package_slug',
          name: 'ghrm-legacy-package-detail',
          redirect: (to: { params: Record<string, string> }) => ({
            path: `${base}/${to.params.package_slug}`,
          }),
        } as unknown as IRouteConfig,
      ];
      legacyRedirects.forEach((route) => sdk.addRoute(route));
    }
    // Register plan detail tabs — only shown when the plan has a linked GHRM package.
    // The condition calls getPackageByPlan(planId): resolves → show tab, rejects 404 → hide.
    Promise.all([
      import('./src/components/GhrmPlanSoftwareTab.vue'),
      import('./src/components/GhrmPlanGithubAccessTab.vue'),
    ]).then(([softwareTab, githubTab]) => {
      const ghrmCondition = (planId: string) =>
        ghrmApi.getPackageByPlan(planId).then(() => true).catch(() => false);

      planDetailTabRegistry.register({
        id: 'ghrm-software',
        label: 'Software',
        component: softwareTab.default,
        condition: ghrmCondition,
      });
      planDetailTabRegistry.register({
        id: 'ghrm-github-access',
        label: 'GitHub Access',
        component: githubTab.default,
        condition: ghrmCondition,
      });
    });

    // OAuth callback
    sdk.addRoute({
      path: '/ghrm/auth/github/callback',
      name: 'ghrm-oauth-callback',
      component: () => import('./src/views/GhrmOAuthCallback.vue'),
      meta: { requiresAuth: false },
    });
  },

  activate() {
    this._active = true;
    userNavRegistry.register({
      pluginName: 'ghrm',
      to: catalogueBase(),
      icon: 'bag',
      labelKey: 'ghrm.title',
      testId: 'nav-ghrm',
      group: 'store',
      externalIcon: true,
    });
  },

  deactivate() {
    this._active = false;
    userNavRegistry.unregister('ghrm');
    checkoutContextRegistry.unregister();
  },
};
