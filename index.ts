import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { userNavRegistry } from '@/plugins/userNavRegistry';
import { registerCmsVueComponent } from '../cms/src/registry/vueComponentRegistry';
import { checkoutContextRegistry } from '../checkout/checkoutContextRegistry';
import { planDetailTabRegistry } from '@/utils/planDetailTabRegistry';
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
  version: '1.0.0',
  description: 'GitHub Repo Manager — software catalogue with subscription-gated GitHub access',
  dependencies: ['cms', 'checkout'],
  _active: false,

  install(sdk: IPlatformSDK) {
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

    // Public catalogue routes — all rendered via CmsPage with the appropriate page slug
    sdk.addRoute({
      path: '/category',
      name: 'ghrm-category-index',
      component: () => import('../cms/src/views/CmsPage.vue'),
      props: { slug: 'category' },
      meta: { requiresAuth: false, cmsLayout: true },
    });
    sdk.addRoute({
      path: '/category/:category_slug',
      name: 'ghrm-package-list',
      component: () => import('../cms/src/views/CmsPage.vue'),
      props: (route: any) => ({ slug: `category/${route.params.category_slug}` }),
      meta: { requiresAuth: false, cmsLayout: true },
    });
    sdk.addRoute({
      path: '/category/:category_slug/:package_slug',
      name: 'ghrm-package-detail',
      component: () => import('../cms/src/views/CmsPage.vue'),
      props: { slug: 'ghrm-software-detail' },
      meta: { requiresAuth: false, cmsLayout: true },
    });
    sdk.addRoute({
      path: '/category/search',
      name: 'ghrm-search',
      component: () => import('./src/views/GhrmSearch.vue'),
      meta: { requiresAuth: false, cmsLayout: true },
    });
    // Register plan detail tabs — only shown when the plan has a linked GHRM package.
    // The condition calls getPackageByPlan(planId): resolves → show tab, rejects 404 → hide.
    Promise.all([
      import('./src/components/GhrmPlanSoftwareTab.vue'),
      import('./src/components/GhrmPlanGithubAccessTab.vue'),
      import('./src/api/ghrmApi'),
    ]).then(([softwareTab, githubTab, { ghrmApi }]) => {
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
      to: '/category',
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
