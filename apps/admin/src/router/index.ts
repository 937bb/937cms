import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { getSetupStatusCached } from '../lib/setup-status';
import { useAuthStore } from '../stores/auth';
import { useTabsStore } from '../stores/tabs';
import { customRoutes } from './custom-routes';

import AdminLayout from '../ui/layouts/AdminLayout.vue';
import SetupPage from '../ui/pages/SetupPage.vue';
import LoginPage from '../ui/pages/LoginPage.vue';
import DashboardPage from '../ui/pages/DashboardPage.vue';
import SystemConfigPage from '../ui/pages/system/SystemConfigPage.vue';
import SystemConfigSeoPage from '../ui/pages/system/SystemConfigSeoPage.vue';
import SystemConfigInterfacePage from '../ui/pages/system/SystemConfigInterfacePage.vue';
import SystemConfigUserPage from '../ui/pages/system/SystemConfigUserPage.vue';
import SystemConfigCommentPage from '../ui/pages/system/SystemConfigCommentPage.vue';
import SystemConfigExtendPage from '../ui/pages/system/SystemConfigExtendPage.vue';
import SystemConfigPlayPage from '../ui/pages/system/SystemConfigPlayPage.vue';
import SystemConfigApiKeyPage from '../ui/pages/system/SystemConfigApiKeyPage.vue';
import SystemSessionTokenConfigPage from '../ui/pages/system/SystemSessionTokenConfigPage.vue';
import SystemInfoPage from '../ui/pages/system/SystemInfoPage.vue';
import SystemConfigUploadPage from '../ui/pages/system/SystemConfigUploadPage.vue';
import SystemConfigEmailPage from '../ui/pages/system/SystemConfigEmailPage.vue';
import SystemConfigRedisPage from '../ui/pages/system/SystemConfigRedisPage.vue';
import DatabasePage from '../ui/pages/system/DatabasePage.vue';
import CollectSettingsPage from '../ui/pages/collect/CollectSettingsPage.vue';
import CollectSourcesPage from '../ui/pages/collect/CollectSourcesPage.vue';
import CollectJobsPage from '../ui/pages/collect/CollectJobsPage.vue';
import CollectRunsPage from '../ui/pages/collect/CollectRunsPage.vue';
import CollectSearchPage from '../ui/pages/collect/CollectSearchPage.vue';
import TypesPage from '../ui/pages/content/TypesPage.vue';
import VodsPage from '../ui/pages/content/VodsPage.vue';
import PlayersPage from '../ui/pages/PlayersPage.vue';
import LinksPage from '../ui/pages/LinksPage.vue';
import ThemeUploadPage from '../ui/pages/themes/ThemeUploadPage.vue';
import MembersPage from '../ui/pages/member/MembersPage.vue';
import MemberGroupsPage from '../ui/pages/member/MemberGroupsPage.vue';
import ArticlesPage from '../ui/pages/content/ArticlesPage.vue';
import GbookPage from '../ui/pages/GbookPage.vue';
import CommentsPage from '../ui/pages/CommentsPage.vue';
import TopicsPage from '../ui/pages/base/TopicsPage.vue';
import AttachmentsPage from '../ui/pages/base/AttachmentsPage.vue';
import ServerGroupsPage from '../ui/pages/vod/ServerGroupsPage.vue';
import DownloadersPage from '../ui/pages/vod/DownloadersPage.vue';
import ActorsPage from '../ui/pages/vod/ActorsPage.vue';
import RolesPage from '../ui/pages/vod/RolesPage.vue';
import BatchPage from '../ui/pages/vod/BatchPage.vue';
import DuplicatesPage from '../ui/pages/vod/DuplicatesPage.vue';
import AdminsPage from '../ui/pages/user/AdminsPage.vue';
import PosterSearchPage from '../ui/pages/tools/PosterSearchPage.vue';

const routes: RouteRecordRaw[] = [
  { path: '/setup', component: SetupPage, meta: { public: true } },
  { path: '/login', component: LoginPage, meta: { public: true } },
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: DashboardPage },

      // 基础设置
      { path: 'settings', redirect: '/settings/config' },
      { path: 'settings/config', component: SystemConfigPage },
      { path: 'settings/seo', component: SystemConfigSeoPage },
      { path: 'settings/interface', component: SystemConfigInterfacePage },
      { path: 'settings/user', component: SystemConfigUserPage },
      { path: 'settings/comment', component: SystemConfigCommentPage },
      { path: 'settings/upload', component: SystemConfigUploadPage },
      { path: 'settings/extend', component: SystemConfigExtendPage },
      { path: 'settings/play', component: SystemConfigPlayPage },

      // 安全设置
      { path: 'security', redirect: '/security/api-keys' },
      { path: 'security/api-keys', component: SystemConfigApiKeyPage },
      { path: 'security/session-token', component: SystemSessionTokenConfigPage },

      // 集成配置
      { path: 'integration', redirect: '/integration/email' },
      { path: 'integration/email', component: SystemConfigEmailPage },

      // 系统维护
      { path: 'system', redirect: '/system/info' },
      { path: 'system/info', component: SystemInfoPage },
      { path: 'system/redis', component: SystemConfigRedisPage },
      { path: 'system/database', component: DatabasePage },

      // 采集管理
      { path: 'collect', redirect: '/collect/settings' },
      { path: 'collect/settings', component: CollectSettingsPage },
      { path: 'collect/sources', component: CollectSourcesPage },
      { path: 'collect/jobs', component: CollectJobsPage },
      { path: 'collect/runs', component: CollectRunsPage },
      { path: 'collect/search', component: CollectSearchPage },
      { path: 'content/types', component: TypesPage },
      { path: 'content/vods', component: VodsPage },
      { path: 'content/articles', component: ArticlesPage },
      { path: 'players', component: PlayersPage },
      { path: 'gbook', component: GbookPage },
      { path: 'comments', component: CommentsPage },
      { path: 'themes', component: ThemeUploadPage },
      { path: 'links', component: LinksPage },
      { path: 'members', component: MembersPage },
      { path: 'member-groups', component: MemberGroupsPage },
      { path: 'base/topics', component: TopicsPage },
      { path: 'base/attachments', component: AttachmentsPage },
      { path: 'vod/server-groups', component: ServerGroupsPage },
      { path: 'vod/downloaders', component: DownloadersPage },
      { path: 'vod/actors', component: ActorsPage },
      { path: 'vod/roles', component: RolesPage },
      { path: 'vod/batch', component: BatchPage },
      { path: 'vod/duplicates', component: DuplicatesPage },
      { path: 'user/admins', component: AdminsPage },
      { path: 'tools/poster', component: PosterSearchPage },
      ...customRoutes,
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  const status = await getSetupStatusCached();
  if (!status.configured && to.path !== '/setup') return { path: '/setup' };
  if (status.configured && status.needsRestart && to.path !== '/setup') return { path: '/setup' };

  if (to.path === '/setup' && status.configured && !status.needsRestart) return { path: '/login' };

  if (to.meta.requiresAuth) {
    const auth = useAuthStore();
    if (!auth.token) return { path: '/login', query: { redirect: to.fullPath } };
  }
  return true;
});

// 路由变化后添加 Tab
router.afterEach((to) => {
  // 只为 AdminLayout 下的路由添加 Tab
  if (to.path.startsWith('/') && !to.path.startsWith('/setup') && !to.path.startsWith('/login')) {
    const tabsStore = useTabsStore();
    const breadcrumbMap: Record<string, string> = {
      '/dashboard': '仪表盘',
      '/content/types': '分类管理',
      '/base/topics': '专题管理',
      '/links': '友链管理',
      '/gbook': '留言管理',
      '/comments': '评论管理',
      '/base/attachments': '附件管理',
      '/vod/server-groups': '服务器组',
      '/players': '播放器',
      '/vod/downloaders': '下载器',
      '/content/vods': '视频数据',
      '/vod/batch': '批量操作',
      '/vod/duplicates': '重名视频',
      '/vod/actors': '演员库',
      '/vod/roles': '角色库',
      '/settings/config': '网站配置',
      '/settings/seo': 'SEO 配置',
      '/settings/user': '会员配置',
      '/settings/comment': '评论配置',
      '/settings/upload': '上传配置',
      '/settings/play': '播放配置',
      '/settings/interface': '接口配置',
      '/settings/extend': '扩展分类',
      '/security/api-keys': 'API Key 管理',
      '/security/session-token': '会话 Token 配置',
      '/integration/email': '邮件配置',
      '/system/info': '系统信息',
      '/system/redis': 'Redis 缓存',
      '/system/database': '数据库',
      '/collect/settings': '统一采集配置',
      '/collect/sources': '采集源管理',
      '/collect/jobs': '采集任务',
      '/collect/runs': '采集记录',
      '/collect/search': '搜索采集',
      '/content/articles': '资讯管理',
      '/members': '会员列表',
      '/member-groups': '会员组',
      '/user/admins': '管理员',
      '/themes': '模板管理',
      '/tools/poster': '海报搜索',
    };

    const label = breadcrumbMap[to.path] || to.path;
    const query = to.query as Record<string, string> | undefined;
    tabsStore.addTab(to.path, label, query);
  }
});
