# 自定义路由开发指南

## 概述

主题开发者可以通过在 `custom-routes.ts` 文件中添加自定义路由，为管理后台扩展新的功能页面。

## 快速开始

### 1. 编辑自定义路由文件

编辑 `apps/admin/src/router/custom-routes.ts`：

```typescript
import type { RouteRecordRaw } from 'vue-router';

export const customRoutes: RouteRecordRaw[] = [
  {
    path: 'themes/my-theme/settings',
    component: () => import('../ui/pages/themes/MyThemeSettings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: 'themes/my-theme/config',
    component: () => import('../ui/pages/themes/MyThemeConfig.vue'),
    meta: { requiresAuth: true }
  }
];
```

### 2. 创建页面组件

在 `apps/admin/src/ui/pages/themes/` 目录下创建你的页面组件：

```vue
<template>
  <n-space vertical size="large">
    <n-card title="我的主题设置">
      <!-- 你的内容 -->
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { NCard, NSpace } from 'naive-ui';
</script>
```

### 3. 访问页面

在浏览器中访问 `/themes/my-theme/settings`

## 路由配置详解

### 基础路由

```typescript
{
  path: 'my-page',                    // 路由路径
  component: () => import('./MyPage.vue'),  // 页面组件
  meta: { requiresAuth: true }        // 元数据
}
```

### 嵌套路由

```typescript
{
  path: 'my-theme',
  component: () => import('./MyThemeLayout.vue'),
  children: [
    {
      path: 'settings',
      component: () => import('./MyThemeSettings.vue')
    },
    {
      path: 'config',
      component: () => import('./MyThemeConfig.vue')
    }
  ]
}
```

### 带参数的路由

```typescript
{
  path: 'my-theme/:id/edit',
  component: () => import('./MyThemeEdit.vue'),
  meta: { requiresAuth: true }
}
```

## 完整示例

### 1. 定义路由

编辑 `custom-routes.ts`：

```typescript
import type { RouteRecordRaw } from 'vue-router';

export const customRoutes: RouteRecordRaw[] = [
  {
    path: 'my-theme',
    component: () => import('../ui/pages/themes/MyThemeLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        component: () => import('../ui/pages/themes/MyThemeDashboard.vue')
      },
      {
        path: 'settings',
        component: () => import('../ui/pages/themes/MyThemeSettings.vue')
      },
      {
        path: 'config/:id',
        component: () => import('../ui/pages/themes/MyThemeConfig.vue')
      }
    ]
  }
];
```

### 2. 创建布局组件

`apps/admin/src/ui/pages/themes/MyThemeLayout.vue`：

```vue
<template>
  <n-space vertical size="large">
    <n-card>
      <n-menu
        :options="menuOptions"
        :value="activeMenu"
        @update:value="handleMenuChange"
      />
    </n-card>
    <router-view />
  </n-space>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NSpace, NMenu } from 'naive-ui';

const router = useRouter();
const activeMenu = ref('dashboard');

const menuOptions = [
  { label: '仪表盘', key: 'dashboard' },
  { label: '设置', key: 'settings' },
  { label: '配置', key: 'config' }
];

function handleMenuChange(key: string) {
  activeMenu.value = key;
  router.push(`/my-theme/${key}`);
}
</script>
```

### 3. 创建页面组件

`apps/admin/src/ui/pages/themes/MyThemeDashboard.vue`：

```vue
<template>
  <n-card title="我的主题仪表盘">
    <n-statistic label="总访问量" :value="10000" />
  </n-card>
</template>

<script setup lang="ts">
import { NCard, NStatistic } from 'naive-ui';
</script>
```

## 最佳实践

### 1. 路由命名规范

```typescript
// ✅ 好的做法
{
  path: 'my-theme/settings',
  component: () => import('../ui/pages/themes/MyThemeSettings.vue')
}

// ❌ 避免
{
  path: 'settings',  // 太通用，容易冲突
  component: () => import('../ui/pages/MySettings.vue')
}
```

### 2. 使用懒加载

```typescript
// ✅ 推荐 - 懒加载组件
{
  path: 'my-page',
  component: () => import('../ui/pages/MyPage.vue')
}

// ❌ 避免 - 直接导入
import MyPage from '../ui/pages/MyPage.vue';
{
  path: 'my-page',
  component: MyPage
}
```

### 3. 添加元数据

```typescript
{
  path: 'my-page',
  component: () => import('../ui/pages/MyPage.vue'),
  meta: {
    requiresAuth: true,      // 需要认证
    title: '我的页面',        // 页面标题
    description: '页面描述'   // 页面描述
  }
}
```

### 4. 使用 TypeScript

```typescript
import type { RouteRecordRaw } from 'vue-router';

export const customRoutes: RouteRecordRaw[] = [
  {
    path: 'my-page',
    component: () => import('../ui/pages/MyPage.vue'),
    meta: { requiresAuth: true }
  }
];
```

## 常见问题

### Q: 如何访问路由参数？

A: 使用 `useRoute()` hook：

```typescript
import { useRoute } from 'vue-router';

const route = useRoute();
const id = route.params.id;
```

### Q: 如何在页面间导航？

A: 使用 `useRouter()` hook：

```typescript
import { useRouter } from 'vue-router';

const router = useRouter();
router.push('/my-theme/settings');
```

### Q: 如何添加面包屑导航？

A: 在路由元数据中添加信息，然后在布局中使用：

```typescript
{
  path: 'my-page',
  component: () => import('../ui/pages/MyPage.vue'),
  meta: {
    breadcrumb: [
      { label: '首页', path: '/' },
      { label: '我的主题', path: '/my-theme' },
      { label: '设置', path: '/my-theme/settings' }
    ]
  }
}
```

### Q: 如何保护路由（需要认证）？

A: 在元数据中设置 `requiresAuth: true`：

```typescript
{
  path: 'my-page',
  component: () => import('../ui/pages/MyPage.vue'),
  meta: { requiresAuth: true }
}
```

## 文件结构建议

```
apps/admin/src/
├── router/
│   ├── index.ts              # 主路由文件
│   └── custom-routes.ts      # 自定义路由（编辑这个文件）
└── ui/pages/
    └── themes/
        ├── MyThemeLayout.vue
        ├── MyThemeDashboard.vue
        ├── MyThemeSettings.vue
        └── MyThemeConfig.vue
```

## 总结

通过编辑 `custom-routes.ts` 文件，你可以轻松为管理后台添加自定义页面，就像 MacCMS 一样便捷！

系统会自动加载这些路由，无需修改其他文件。
