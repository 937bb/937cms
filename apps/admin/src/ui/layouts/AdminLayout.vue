<template>
  <n-layout has-sider class="bb-layout">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed="collapsed"
      :collapsed-width="64"
      :width="260"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="bb-brand" :class="{ collapsed }">
        <div class="bb-brand-title">937 CMS</div>
        <div v-if="!collapsed" class="bb-brand-sub">Console</div>
      </div>
      <n-menu :value="activeKey" :options="menuOptions" @update:value="onSelect" />
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered class="bb-header">
        <n-space justify="space-between" align="center" style="width: 100%">
          <n-breadcrumb>
            <n-breadcrumb-item v-for="(item, idx) in breadcrumbs" :key="idx">
              <router-link v-if="item.path && idx < breadcrumbs.length - 1" :to="item.path">{{
                item.label
              }}</router-link>
              <span v-else>{{ item.label }}</span>
            </n-breadcrumb-item>
          </n-breadcrumb>
          <n-space align="center">
            <n-button tertiary size="small" @click="onLogout">退出登录</n-button>
          </n-space>
        </n-space>
      </n-layout-header>

      <TabBar />

      <n-layout-content class="bb-content">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import type { MenuOption } from 'naive-ui';
import { NBreadcrumb, NBreadcrumbItem, NIcon } from 'naive-ui';
import { computed, h, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useTabsStore } from '../../stores/tabs';
import TabBar from '../components/TabBar.vue';
import {
  DashboardOutlined,
  AppstoreOutlined,
  VideoCameraOutlined,
  SettingOutlined,
  CloudOutlined,
  FileTextOutlined,
  TeamOutlined,
  BgColorsOutlined,
  ToolOutlined,
} from '@vicons/antd';

const collapsed = ref(false);
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const tabsStore = useTabsStore();

onMounted(() => {
  tabsStore.restore();
});

function link(label: string, to: string) {
  return () => h(RouterLink, { to }, { default: () => label });
}

function renderIcon(icon: any) {
  return () => h(NIcon, { size: 18 }, { default: () => h(icon) });
}

const menuOptions: MenuOption[] = [
  { label: link('仪表盘', '/dashboard'), key: '/dashboard', icon: renderIcon(DashboardOutlined) },
  {
    label: '基础',
    key: '/base',
    icon: renderIcon(AppstoreOutlined),
    children: [
      { label: link('分类管理', '/content/types'), key: '/content/types' },
      { label: link('专题管理', '/base/topics'), key: '/base/topics' },
      { label: link('友链管理', '/links'), key: '/links' },
      { label: link('留言管理', '/gbook'), key: '/gbook' },
      { label: link('评论管理', '/comments'), key: '/comments' },
      { label: link('附件管理', '/base/attachments'), key: '/base/attachments' },
    ],
  },
  {
    label: '视频',
    key: '/vod',
    icon: renderIcon(VideoCameraOutlined),
    children: [
      { label: link('视频数据', '/content/vods'), key: '/content/vods' },
      {
        label: '播放配置',
        key: '/playback',
        children: [
          { label: link('播放器', '/players'), key: '/players' },
          { label: link('服务器组', '/vod/server-groups'), key: '/vod/server-groups' },
          { label: link('下载器', '/vod/downloaders'), key: '/vod/downloaders' },
        ],
      },
      {
        label: '采集管理',
        key: '/collection',
        children: [
          { label: link('采集源', '/collect/sources'), key: '/collect/sources' },
          { label: link('采集配置', '/collect/settings'), key: '/collect/settings' },
          { label: link('采集任务', '/collect/jobs'), key: '/collect/jobs' },
          { label: link('采集记录', '/collect/runs'), key: '/collect/runs' },
          { label: link('搜索采集', '/collect/search'), key: '/collect/search' },
        ],
      },
      {
        label: '视频库',
        key: '/library',
        children: [
          { label: link('演员库', '/vod/actors'), key: '/vod/actors' },
          { label: link('角色库', '/vod/roles'), key: '/vod/roles' },
        ],
      },
      {
        label: '视频工具',
        key: '/tools-vod',
        children: [
          { label: link('批量操作', '/vod/batch'), key: '/vod/batch' },
          { label: link('重名视频', '/vod/duplicates'), key: '/vod/duplicates' },
        ],
      },
      {
        label: '视频筛选',
        key: '/filters',
        children: [
          {
            label: link('无地址视频', '/content/vods?filter=nourl'),
            key: '/content/vods?filter=nourl',
          },
          {
            label: link('已锁定视频', '/content/vods?filter=locked'),
            key: '/content/vods?filter=locked',
          },
          {
            label: link('未审核视频', '/content/vods?filter=pending'),
            key: '/content/vods?filter=pending',
          },
          {
            label: link('需积分视频', '/content/vods?filter=points'),
            key: '/content/vods?filter=points',
          },
          {
            label: link('有分集剧情', '/content/vods?filter=plot'),
            key: '/content/vods?filter=plot',
          },
        ],
      },
    ],
  },
  {
    label: '设置',
    key: '/settings',
    icon: renderIcon(SettingOutlined),
    children: [
      {
        label: '基础设置',
        key: '/settings-base',
        children: [
          { label: link('网站配置', '/settings/config'), key: '/settings/config' },
          { label: link('SEO 配置', '/settings/seo'), key: '/settings/seo' },
          { label: link('会员配置', '/settings/user'), key: '/settings/user' },
          { label: link('评论配置', '/settings/comment'), key: '/settings/comment' },
          { label: link('上传配置', '/settings/upload'), key: '/settings/upload' },
          { label: link('播放配置', '/settings/play'), key: '/settings/play' },
          { label: link('接口配置', '/settings/interface'), key: '/settings/interface' },
          { label: link('扩展分类', '/settings/extend'), key: '/settings/extend' },
        ],
      },
      {
        label: '安全设置',
        key: '/security',
        children: [
          { label: link('API Key 管理', '/security/api-keys'), key: '/security/api-keys' },
          {
            label: link('会话 Token 配置', '/security/session-token'),
            key: '/security/session-token',
          },
        ],
      },
    ],
  },
  {
    label: '系统',
    key: '/system',
    icon: renderIcon(ToolOutlined),
    children: [
      {
        label: '集成配置',
        key: '/integration',
        children: [
          { label: link('第三方登录', '/integration/connect'), key: '/integration/connect' },
          { label: link('支付配置', '/integration/pay'), key: '/integration/pay' },
          { label: link('微信配置', '/integration/weixin'), key: '/integration/weixin' },
          { label: link('邮件配置', '/integration/email'), key: '/integration/email' },
          { label: link('短信配置', '/integration/sms'), key: '/integration/sms' },
        ],
      },
      {
        label: '系统维护',
        key: '/system-maintenance',
        children: [
          { label: link('系统信息', '/system/info'), key: '/system/info' },
          { label: link('Redis 缓存', '/system/redis'), key: '/system/redis' },
          { label: link('数据库', '/system/database'), key: '/system/database' },
        ],
      },
    ],
  },
  {
    label: '资讯',
    key: '/article',
    icon: renderIcon(FileTextOutlined),
    children: [{ label: link('资讯管理', '/content/articles'), key: '/content/articles' }],
  },
  {
    label: '会员',
    key: '/member',
    icon: renderIcon(TeamOutlined),
    children: [
      { label: link('会员列表', '/members'), key: '/members' },
      { label: link('会员组', '/member-groups'), key: '/member-groups' },
      { label: link('管理员', '/user/admins'), key: '/user/admins' },
    ],
  },
  { label: link('模板管理', '/themes'), key: '/themes', icon: renderIcon(BgColorsOutlined) },
  {
    label: '工具',
    key: '/tools',
    icon: renderIcon(ToolOutlined),
    children: [{ label: link('海报搜索', '/tools/poster'), key: '/tools/poster' }],
  },
];

const activeKey = computed(() => {
  const p = route.path;
  const q = route.query.filter as string | undefined;
  if (p === '/content/vods' && q) return `/content/vods?filter=${q}`;
  if (p.startsWith('/content/')) return p;
  if (p.startsWith('/base/')) return p;
  if (p.startsWith('/vod/')) return p;
  if (p.startsWith('/settings/')) return p;
  if (p.startsWith('/security/')) return p;
  if (p.startsWith('/integration/')) return p;
  if (p.startsWith('/system/')) return p;
  if (p.startsWith('/collect/')) return p;
  if (p.startsWith('/user/')) return p;
  if (p.startsWith('/tools/')) return p;
  if (p.startsWith('/themes/')) return '/themes';
  return p;
});

function onSelect(key: string) {
  router.push(String(key));
}

function onLogout() {
  auth.logout();
  router.push('/login');
}

// 面包屑导航映射
const breadcrumbMap: Record<string, { label: string; parent?: string }> = {
  '/dashboard': { label: '仪表盘' },
  // 基础
  '/content/types': { label: '分类管理', parent: '基础' },
  '/base/topics': { label: '专题管理', parent: '基础' },
  '/links': { label: '友链管理', parent: '基础' },
  '/gbook': { label: '留言管理', parent: '基础' },
  '/comments': { label: '评论管理', parent: '基础' },
  '/base/attachments': { label: '附件管理', parent: '基础' },
  // 视频
  '/content/vods': { label: '视频数据', parent: '视频' },
  // 播放配置
  '/players': { label: '播放器', parent: '播放配置' },
  '/vod/server-groups': { label: '服务器组', parent: '播放配置' },
  '/vod/downloaders': { label: '下载器', parent: '播放配置' },
  // 采集管理
  '/collect/sources': { label: '采集源', parent: '采集管理' },
  '/collect/settings': { label: '采集配置', parent: '采集管理' },
  '/collect/jobs': { label: '采集任务', parent: '采集管理' },
  '/collect/runs': { label: '采集记录', parent: '采集管理' },
  '/collect/search': { label: '搜索采集', parent: '采集管理' },
  // 视频库
  '/vod/actors': { label: '演员库', parent: '视频库' },
  '/vod/roles': { label: '角色库', parent: '视频库' },
  // 视频工具
  '/vod/batch': { label: '批量操作', parent: '视频工具' },
  '/vod/duplicates': { label: '重名视频', parent: '视频工具' },
  // 基础设置
  '/settings/config': { label: '网站配置', parent: '基础设置' },
  '/settings/seo': { label: 'SEO 配置', parent: '基础设置' },
  '/settings/user': { label: '会员配置', parent: '基础设置' },
  '/settings/comment': { label: '评论配置', parent: '基础设置' },
  '/settings/upload': { label: '上传配置', parent: '基础设置' },
  '/settings/play': { label: '播放配置', parent: '基础设置' },
  '/settings/interface': { label: '接口配置', parent: '基础设置' },
  '/settings/extend': { label: '扩展分类', parent: '基础设置' },
  // 安全设置
  '/security/api-keys': { label: 'API Key 管理', parent: '安全设置' },
  '/security/session-token': { label: '会话 Token 配置', parent: '安全设置' },
  // 集成配置
  '/integration/connect': { label: '第三方登录', parent: '集成配置' },
  '/integration/pay': { label: '支付配置', parent: '集成配置' },
  '/integration/weixin': { label: '微信配置', parent: '集成配置' },
  '/integration/email': { label: '邮件配置', parent: '集成配置' },
  '/integration/sms': { label: '短信配置', parent: '集成配置' },
  // 系统维护
  '/system/info': { label: '系统信息', parent: '系统维护' },
  '/system/redis': { label: 'Redis 缓存', parent: '系统维护' },
  '/system/database': { label: '数据库', parent: '系统维护' },
  // 工具
  '/tools/poster': { label: '海报搜索', parent: '工具' },
  // 资讯
  '/content/articles': { label: '资讯管理', parent: '资讯' },
  // 会员
  '/members': { label: '会员列表', parent: '会员' },
  '/member-groups': { label: '会员组', parent: '会员' },
  // 其他
  '/themes': { label: '模板管理' },
};

const breadcrumbs = computed(() => {
  const path = route.path;
  const items: { label: string; path?: string }[] = [{ label: '首页', path: '/dashboard' }];

  // 处理模板配置页面
  if (path.startsWith('/themes/')) {
    items.push({ label: '模板管理', path: '/themes' });
    items.push({ label: '模板配置' });
    return items;
  }

  const info = breadcrumbMap[path];
  if (info) {
    if (info.parent) {
      items.push({ label: info.parent });
    }
    items.push({ label: info.label });
  }
  return items;
});
</script>

<style scoped>
.bb-layout {
  height: 100vh;
}

.bb-brand {
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.bb-brand-title {
  font-weight: 800;
  font-size: 16px;
  line-height: 18px;
}

.bb-brand-sub {
  opacity: 0.7;
  font-size: 12px;
  margin-top: 6px;
}

.bb-header {
  padding: 0 16px;
  height: 56px;
  display: flex;
  align-items: center;
}

.bb-content {
  padding: 16px;
  box-sizing: border-box;
  min-height: calc(100vh - 56px);
}

:deep(.n-layout-sider.n-layout-sider--collapsed .n-menu-item-content) {
  justify-content: center;
  align-items: center;
  padding: 0 !important;
}

:deep(.n-layout-sider.n-layout-sider--collapsed .n-menu-item) {
  padding: 0 !important;
}

:deep(.n-layout-sider.n-layout-sider--collapsed .n-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 !important;
}
</style>
