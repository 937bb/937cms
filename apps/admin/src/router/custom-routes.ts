import type { RouteRecordRaw } from 'vue-router';

/**
 * 自定义主题路由
 *
 * 主题开发者可以在主题包中创建 routes.ts 文件
 * 导出路由配置，系统会自动加载
 *
 * 示例：
 * export const themeRoutes: RouteRecordRaw[] = [
 *   {
 *     path: 'themes/my-theme/settings',
 *     component: () => import('./pages/MyThemeSettings.vue'),
 *     meta: { requiresAuth: true }
 *   }
 * ];
 */

export const customRoutes: RouteRecordRaw[] = [
  {
    path: 'themes/mxpro',
    component: () => import('../ui/pages/themes/MxproConfigPage.vue'),
    meta: { requiresAuth: true },
  },
];
