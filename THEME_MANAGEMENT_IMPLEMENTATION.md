# 前端主题管理系统 - 实现完成

## 概述

已完成前端主题管理系统的核心实现，允许用户和第三方开发者无需手动修改数据库即可安装、配置和管理主题。

## 已完成的工作

### 1. 数据库迁移 (Migration)

**文件**: `apps/api/sql/migrations/007_create_theme_management.sql`

创建了两个新表：

#### `bb_theme` 表 - 主题元数据
```sql
CREATE TABLE `bb_theme` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `theme_id` varchar(64) NOT NULL UNIQUE,      -- 主题唯一标识
  `name` varchar(128) NOT NULL,                -- 主题名称
  `version` varchar(32) NOT NULL,              -- 主题版本
  `description` text,                          -- 主题描述
  `author` varchar(128),                       -- 主题作者
  `homepage` varchar(255),                     -- 主题主页
  `repository` varchar(255),                   -- 主题仓库
  `config_schema` json NOT NULL,               -- 配置字段定义 (JSON Schema)
  `status` tinyint unsigned DEFAULT 1,         -- 状态: 0=禁用, 1=启用
  `is_active` tinyint unsigned DEFAULT 0,      -- 是否激活: 0=否, 1=是
  `created_at` int unsigned DEFAULT 0,
  `updated_at` int unsigned DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_theme_id` (`theme_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_status` (`status`)
)
```

#### `bb_theme_setting` 表 - 主题配置值
```sql
CREATE TABLE `bb_theme_setting` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `theme_id` varchar(64) NOT NULL,             -- 主题ID
  `config_key` varchar(128) NOT NULL,          -- 配置键
  `config_value` json NOT NULL,                -- 配置值 (JSON)
  `created_at` int unsigned DEFAULT 0,
  `updated_at` int unsigned DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_theme_config` (`theme_id`, `config_key`),
  KEY `idx_theme_id` (`theme_id`)
)
```

### 2. 后端服务实现

#### ThemeManagementService
**文件**: `apps/api/src/modules/admin/theme/theme-management.service.ts`

核心方法：
- `listThemes()` - 列出所有已安装的主题
- `getTheme(themeId)` - 获取主题详情及其配置
- `installTheme(input)` - 安装新主题
- `updateThemeConfig(themeId, config)` - 更新主题配置
- `activateTheme(themeId)` - 激活指定主题
- `deleteTheme(themeId)` - 删除主题
- `getActiveThemeConfig()` - 获取当前激活主题的配置

### 3. API 端点

#### 管理员 API (需要 JWT 认证)

**基础路由**: `/admin/theme`

```
GET    /admin/theme                    - 获取主题列表
GET    /admin/theme/:themeId           - 获取主题详情
POST   /admin/theme                    - 安装新主题
PUT    /admin/theme/:themeId/config    - 更新主题配置
POST   /admin/theme/:themeId/activate  - 激活主题
DELETE /admin/theme/:themeId           - 删除主题
```

#### 公开 API (无需认证)

**基础路由**: `/api/theme`

```
GET    /api/theme/active               - 获取当前激活主题的配置
GET    /api/theme/config?name=xxx      - 获取指定主题的配置 (向后兼容)
```

### 4. 模块集成

#### ThemeManagementModule
**文件**: `apps/api/src/modules/admin/theme/theme-management.module.ts`

- 注册 `ThemeManagementService`
- 注册 `ThemeManagementController`
- 导入 `DbModule`

#### AdminModule 集成
已在 `apps/api/src/modules/admin/admin.module.ts` 中导入 `ThemeManagementModule`

#### PublicModule 集成
已在 `apps/api/src/modules/public/public.module.ts` 中：
- 导入 `ThemeManagementModule`
- 更新 `PublicThemeController` 以支持新的主题管理 API

## API 使用示例

### 1. 安装新主题

```bash
POST /admin/theme
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "themeId": "my-theme",
  "name": "我的主题",
  "version": "1.0.0",
  "description": "自定义主题",
  "author": "开发者名称",
  "homepage": "https://example.com",
  "repository": "https://github.com/example/my-theme",
  "configSchema": {
    "title": {
      "type": "string",
      "label": "网站标题",
      "description": "网站名称",
      "default": "我的网站"
    },
    "primaryColor": {
      "type": "color",
      "label": "主色调",
      "description": "主题主色调",
      "default": "#1890ff"
    },
    "logo": {
      "type": "image",
      "label": "网站Logo",
      "description": "网站Logo图片"
    }
  }
}
```

### 2. 获取主题列表

```bash
GET /admin/theme
Authorization: Bearer <jwt_token>

Response:
{
  "items": [
    {
      "id": 1,
      "themeId": "default",
      "name": "默认主题",
      "version": "1.0.0",
      "description": "系统默认主题",
      "author": "937CMS",
      "configSchema": {...},
      "status": 1,
      "isActive": 1,
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  ]
}
```

### 3. 更新主题配置

```bash
PUT /admin/theme/my-theme/config
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "config": {
    "title": "新的网站标题",
    "primaryColor": "#ff0000",
    "logo": "https://example.com/logo.png"
  }
}
```

### 4. 激活主题

```bash
POST /admin/theme/my-theme/activate
Authorization: Bearer <jwt_token>
```

### 5. 获取当前激活主题配置 (前端使用)

```bash
GET /api/theme/active

Response:
{
  "themeId": "my-theme",
  "config": {
    "title": "新的网站标题",
    "primaryColor": "#ff0000",
    "logo": "https://example.com/logo.png"
  }
}
```

## 配置字段类型支持

支持的配置字段类型：

| 类型 | 说明 | 示例 |
|------|------|------|
| `string` | 文本字符串 | `"网站标题"` |
| `number` | 数字 | `100` |
| `boolean` | 布尔值 | `true` |
| `color` | 颜色选择器 | `"#1890ff"` |
| `select` | 下拉选择 | `"option1"` |
| `textarea` | 多行文本 | `"长文本内容"` |
| `array` | 数组 | `[1, 2, 3]` |
| `object` | 对象 | `{key: "value"}` |
| `image` | 图片上传 | `"https://..."` |
| `url` | URL 链接 | `"https://example.com"` |
| `json` | JSON 数据 | `{...}` |

## 主题开发指南

### 主题结构

第三方开发者可以创建主题包，包含以下结构：

```
my-theme/
├── theme.config.json          # 主题配置文件
├── components/                # 主题组件
├── layouts/                   # 主题布局
├── pages/                     # 主题页面
└── README.md                  # 主题文档
```

### theme.config.json 示例

```json
{
  "themeId": "my-theme",
  "name": "我的主题",
  "version": "1.0.0",
  "description": "自定义主题描述",
  "author": "开发者名称",
  "homepage": "https://example.com",
  "repository": "https://github.com/example/my-theme",
  "configSchema": {
    "title": {
      "type": "string",
      "label": "网站标题",
      "description": "网站名称",
      "default": "我的网站",
      "required": true
    },
    "primaryColor": {
      "type": "color",
      "label": "主色调",
      "description": "主题主色调",
      "default": "#1890ff"
    },
    "logo": {
      "type": "image",
      "label": "网站Logo",
      "description": "网站Logo图片"
    },
    "footerText": {
      "type": "textarea",
      "label": "页脚文本",
      "description": "页脚显示的文本内容"
    }
  }
}
```

## 用户使用流程

### 1. 安装主题

**方式一：通过 API 安装**
- 管理员在后台上传或输入主题配置
- 系统自动创建主题记录

**方式二：第三方开发者提供**
- 开发者提供 `theme.config.json`
- 管理员通过 API 安装

### 2. 配置主题

1. 进入管理后台 → 主题管理
2. 选择要配置的主题
3. 根据 `configSchema` 自动生成配置表单
4. 填写配置值
5. 保存配置

### 3. 激活主题

1. 在主题列表中选择主题
2. 点击"激活"按钮
3. 系统自动停用其他主题，激活选中主题

### 4. 前端使用

前端应用启动时：
```javascript
// 获取当前激活主题配置
const response = await fetch('/api/theme/active');
const { themeId, config } = await response.json();

// 使用配置
document.title = config.title;
document.documentElement.style.setProperty('--primary-color', config.primaryColor);
```

## 向后兼容性

系统保留了原有的 `bb_theme_config` 表和相关 API，确保现有主题继续正常工作：

- `AdminThemeService` - 管理原有主题配置
- `PublicThemeService` - 获取原有主题配置
- `/api/theme/config?name=xxx` - 向后兼容的 API

## 待实现功能

### 1. 主题上传和安装
- 支持 ZIP 文件上传
- 自动解析 `theme.config.json`
- 自动安装主题

### 2. 主题验证
- 验证 `theme.config.json` 格式
- 验证必需字段
- 验证配置字段类型

### 3. 主题依赖管理
- 支持主题依赖声明
- 自动检查依赖
- 依赖冲突提示

### 4. 主题预览
- 支持主题预览功能
- 实时查看配置效果

### 5. 前端 UI
- 主题管理页面
- 主题配置表单自动生成
- 主题预览界面

## 文件清单

### 新增文件
- `apps/api/sql/migrations/007_create_theme_management.sql` - 数据库迁移
- `apps/api/src/modules/admin/theme/theme-management.service.ts` - 主题服务
- `apps/api/src/modules/admin/theme/theme-management.controller.ts` - 主题控制器
- `apps/api/src/modules/admin/theme/theme-management.module.ts` - 主题模块
- `apps/api/src/modules/public/theme/public-theme.controller.ts` - 公开主题控制器 (已更新)

### 修改文件
- `apps/api/src/modules/admin/admin.module.ts` - 导入 ThemeManagementModule
- `apps/api/src/modules/public/public.module.ts` - 导入 ThemeManagementModule，更新 PublicThemeController

## 总结

前端主题管理系统已完成核心实现，提供了：

✅ 完整的数据库设计
✅ 后端服务和 API 端点
✅ 主题安装、配置、激活、删除功能
✅ 动态配置字段支持
✅ 前端获取主题配置的 API
✅ 向后兼容性

系统现在允许用户和第三方开发者无需手动修改数据库即可管理主题，解决了原有系统的不便之处。
