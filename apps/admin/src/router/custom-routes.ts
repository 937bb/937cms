import type { RouteRecordRaw } from 'vue-router';
import MxproConfigPage from '../ui/pages/themes/MxproConfigPage.vue';

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
    component: MxproConfigPage,
    meta: { requiresAuth: true }
  },
  // 主题开发者在这里添加自定义路由
  // 示例：
  // {
  //   path: 'themes/my-theme/config',
  //   component: () => import('./pages/MyThemeConfig.vue'),
  //   meta: { requiresAuth: true }
  // }
];
