# 前端主题管理系统设计

## 问题分析

当前流程：
```
开发者开发主题 → 手动修改 MySQL → 部署
```

问题：
- ❌ 用户无法自助添加主题
- ❌ 第三方开发者无法自助配置
- ❌ 配置项无法动态管理
- ❌ 主题升级困难

## 解决方案

### 1. 主题结构标准化

每个主题项目应该包含 `theme.config.json`：

```json
{
  "id": "theme-default",
  "name": "默认主题",
  "version": "1.0.0",
  "description": "937CMS 默认主题",
  "author": "937CMS",
  "homepage": "https://github.com/937bb/theme-default",
  "repository": {
    "type": "git",
    "url": "https://github.com/937bb/theme-default.git"
  },
  "schema": {
    "logo": {
      "type": "string",
      "label": "Logo URL",
      "description": "网站 Logo",
      "default": "/logo.png",
      "required": true
    },
    "primaryColor": {
      "type": "color",
      "label": "主色调",
      "description": "网站主色调",
      "default": "#1890ff",
      "required": false
    },
    "itemsPerPage": {
      "type": "number",
      "label": "每页项目数",
      "description": "列表页每页显示项目数",
      "default": 20,
      "min": 1,
      "max": 100,
      "required": false
    },
    "enableComments": {
      "type": "boolean",
      "label": "启用评论",
      "description": "是否启用评论功能",
      "default": true,
      "required": false
    },
    "categories": {
      "type": "array",
      "label": "分类配置",
      "description": "首页显示的分类",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "number" },
          "name": { "type": "string" }
        }
      },
      "required": false
    }
  }
}
```

### 2. 数据库设计

#### 主题表
```sql
CREATE TABLE IF NOT EXISTS `bb_theme` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `theme_id` varchar(64) NOT NULL UNIQUE COMMENT '主题 ID',
  `name` varchar(128) NOT NULL COMMENT '主题名称',
  `version` varchar(32) NOT NULL COMMENT '版本号',
  `description` text COMMENT '主题描述',
  `author` varchar(128) COMMENT '作者',
  `homepage` varchar(255) COMMENT '主题主页',
  `repository` varchar(255) COMMENT '代码仓库',
  `config_schema` json NOT NULL COMMENT '配置 Schema',
  `status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态: 0=禁用, 1=启用',
  `is_active` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '是否为当前活跃主题',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_theme_id` (`theme_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='前端主题表';

-- 重命名现有的 bb_theme_config 为 bb_theme_setting
ALTER TABLE `bb_theme_config` RENAME TO `bb_theme_setting`;

-- 修改 bb_theme_setting 结构
ALTER TABLE `bb_theme_setting` ADD COLUMN `theme_id` varchar(64) NOT NULL DEFAULT 'default' AFTER `id`;
ALTER TABLE `bb_theme_setting` ADD KEY `idx_theme_id` (`theme_id`);
```

#### 主题配置表（现有的 bb_theme_config）
```sql
-- 保持现有结构，但添加 theme_id 关联
-- 这样可以支持多主题配置
```

### 3. 主题管理 API

#### 获取主题列表
```
GET /admin/themes
返回：
{
  "items": [
    {
      "id": 1,
      "themeId": "theme-default",
      "name": "默认主题",
      "version": "1.0.0",
      "isActive": true,
      "status": 1
    }
  ]
}
```

#### 获取主题详情
```
GET /admin/themes/:themeId
返回：
{
  "id": 1,
  "themeId": "theme-default",
  "name": "默认主题",
  "version": "1.0.0",
  "description": "...",
  "author": "...",
  "configSchema": { ... },
  "config": { ... },  // 当前配置值
  "status": 1,
  "isActive": true
}
```

#### 上传/安装主题
```
POST /admin/themes/install
Content-Type: multipart/form-data

参数：
- file: 主题 ZIP 文件（包含 theme.config.json）
- 或 url: 主题 Git 仓库 URL

返回：
{
  "ok": true,
  "themeId": "theme-custom",
  "message": "主题安装成功"
}
```

#### 更新主题配置
```
PUT /admin/themes/:themeId/config
{
  "logo": "/new-logo.png",
  "primaryColor": "#ff0000",
  "itemsPerPage": 30
}

返回：
{
  "ok": true,
  "message": "配置已保存"
}
```

#### 激活主题
```
POST /admin/themes/:themeId/activate
返回：
{
  "ok": true,
  "message": "主题已激活"
}
```

#### 删除主题
```
DELETE /admin/themes/:themeId
返回：
{
  "ok": true,
  "message": "主题已删除"
}
```

### 4. 前端获取主题配置

#### 获取当前活跃主题配置
```
GET /api/theme/config
返回：
{
  "themeId": "theme-default",
  "config": {
    "logo": "/logo.png",
    "primaryColor": "#1890ff",
    "itemsPerPage": 20,
    "enableComments": true
  }
}
```

#### 获取主题 Schema（用于配置表单）
```
GET /api/theme/schema
返回：
{
  "themeId": "theme-default",
  "schema": {
    "logo": { ... },
    "primaryColor": { ... },
    ...
  }
}
```

### 5. 主题开发者指南

#### 主题项目结构
```
theme-custom/
├── theme.config.json          # 主题配置文件
├── package.json
├── nuxt.config.ts
├── app.vue
├── pages/
├── components/
├── layouts/
├── public/
└── README.md
```

#### theme.config.json 示例
```json
{
  "id": "theme-custom",
  "name": "自定义主题",
  "version": "1.0.0",
  "description": "我的自定义主题",
  "author": "开发者名称",
  "schema": {
    "siteName": {
      "type": "string",
      "label": "网站名称",
      "default": "937CMS",
      "required": true
    },
    "siteDescription": {
      "type": "string",
      "label": "网站描述",
      "default": "",
      "required": false
    }
  }
}
```

### 6. 配置项类型支持

```typescript
type ConfigFieldType =
  | 'string'      // 文本
  | 'number'      // 数字
  | 'boolean'     // 布尔值
  | 'color'       // 颜色选择器
  | 'select'      // 下拉选择
  | 'textarea'    // 多行文本
  | 'array'       // 数组
  | 'object'      // 对象
  | 'image'       // 图片上传
  | 'url'         // URL
  | 'json'        // JSON 编辑器
```

### 7. 主题配置表单自动生成

后端返回 Schema，前端根据 Schema 自动生成配置表单：

```typescript
// 前端伪代码
const schema = await fetchThemeSchema();
const form = generateFormFromSchema(schema);
// 自动生成对应的表单控件
```

## 用户使用流程

### 安装新主题

1. 进入管理后台 → 主题管理
2. 点击"安装主题"
3. 选择上传 ZIP 或输入 Git 仓库 URL
4. 系统自动解析 `theme.config.json`
5. 显示主题信息和配置项
6. 点击"安装"完成

### 配置主题

1. 进入主题管理
2. 选择要配置的主题
3. 系统根据 Schema 生成配置表单
4. 用户填写配置项
5. 点击"保存"

### 切换主题

1. 进入主题管理
2. 点击"激活"按钮
3. 系统切换到新主题

## 优势

✅ 用户可自助安装主题
✅ 第三方开发者可自助配置
✅ 配置项动态管理
✅ 支持主题升级
✅ 配置表单自动生成
✅ 无需手动修改 MySQL

## 实现步骤

1. 创建主题表和迁移
2. 实现主题管理 Service
3. 实现主题管理 API
4. 实现主题上传/安装逻辑
5. 实现主题配置管理
6. 前端界面开发
7. 文档和示例主题
