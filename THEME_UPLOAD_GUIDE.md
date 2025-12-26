# 主题配置上传指南

## 概述

用户和第三方开发者可以通过上传 `theme.config.json` 文件来安装新主题，无需手动修改数据库。

## 使用流程

### 1. 准备主题配置文件

创建 `theme.config.json` 文件，包含以下信息：

```json
{
  "themeId": "my-theme",
  "name": "我的主题",
  "version": "1.0.0",
  "description": "主题描述",
  "author": "开发者名称",
  "homepage": "https://example.com",
  "repository": "https://github.com/example/my-theme",
  "configSchema": {
    "title": {
      "type": "string",
      "label": "网站标题",
      "description": "网站名称",
      "default": "我的网站"
    }
  }
}
```

### 2. 上传配置文件

1. 登录管理后台
2. 进入 **主题管理** 页面
3. 点击 **选择配置文件** 按钮
4. 选择 `theme.config.json` 文件
5. 系统自动上传并安装主题

### 3. 管理已安装的主题

- **激活主题**: 点击开关激活主题
- **删除主题**: 点击删除按钮移除主题

## 配置字段类型

### 支持的字段类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `string` | 文本字符串 | `"网站标题"` |
| `number` | 数字 | `20` |
| `boolean` | 布尔值 | `true` |
| `color` | 颜色 | `"#1890ff"` |
| `select` | 下拉选择 | `"light"` |
| `textarea` | 多行文本 | `"页脚文本"` |
| `image` | 图片 | `"https://..."` |
| `url` | URL 链接 | `"https://example.com"` |
| `array` | 数组 | `[1, 2, 3]` |
| `object` | 对象 | `{key: "value"}` |
| `json` | JSON 数据 | `{...}` |

### 字段定义示例

```json
{
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
    "itemsPerPage": {
      "type": "number",
      "label": "每页显示数量",
      "default": 20,
      "min": 1,
      "max": 100
    },
    "theme": {
      "type": "select",
      "label": "主题风格",
      "default": "light",
      "options": [
        { "label": "浅色", "value": "light" },
        { "label": "深色", "value": "dark" }
      ]
    }
  }
}
```

## 完整示例

参考 `theme.config.example.json` 文件获取完整示例。

## API 端点

### 上传主题配置

```
POST /admin/theme/upload
Content-Type: multipart/form-data

file: theme.config.json
```

**响应示例**:
```json
{
  "ok": true,
  "themeId": "my-theme",
  "message": "Theme installed"
}
```

### 获取主题列表

```
GET /admin/theme
```

**响应示例**:
```json
{
  "items": [
    {
      "id": 1,
      "themeId": "my-theme",
      "name": "我的主题",
      "version": "1.0.0",
      "description": "主题描述",
      "author": "开发者名称",
      "configSchema": {...},
      "status": 1,
      "isActive": 1,
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  ]
}
```

### 激活主题

```
POST /admin/theme/:themeId/activate
```

### 删除主题

```
DELETE /admin/theme/:themeId
```

## 开发者指南

### 创建新主题

1. 创建主题目录结构
2. 编写 `theme.config.json` 配置文件
3. 实现主题组件和样式
4. 上传配置文件到系统

### 配置字段最佳实践

- 使用清晰的字段标签和描述
- 提供合理的默认值
- 为必需字段设置 `required: true`
- 为数字字段设置 `min` 和 `max` 限制
- 为选择字段提供完整的选项列表

### 示例主题配置

```json
{
  "themeId": "my-awesome-theme",
  "name": "我的超棒主题",
  "version": "1.0.0",
  "description": "一个功能完整的主题",
  "author": "开发者名称",
  "homepage": "https://example.com",
  "repository": "https://github.com/example/my-awesome-theme",
  "configSchema": {
    "siteName": {
      "type": "string",
      "label": "网站名称",
      "description": "显示在浏览器标签页的网站名称",
      "default": "我的网站",
      "required": true
    },
    "siteDescription": {
      "type": "textarea",
      "label": "网站描述",
      "description": "网站的简短描述",
      "default": "欢迎来到我的网站"
    },
    "primaryColor": {
      "type": "color",
      "label": "主色调",
      "description": "主题的主要颜色",
      "default": "#1890ff"
    },
    "secondaryColor": {
      "type": "color",
      "label": "辅助色",
      "description": "主题的辅助颜色",
      "default": "#f5222d"
    },
    "logo": {
      "type": "image",
      "label": "网站Logo",
      "description": "网站Logo图片"
    },
    "itemsPerPage": {
      "type": "number",
      "label": "每页显示数量",
      "description": "列表每页显示的项目数",
      "default": 20,
      "min": 1,
      "max": 100
    },
    "enableComments": {
      "type": "boolean",
      "label": "启用评论",
      "description": "是否启用评论功能",
      "default": true
    },
    "commentModeration": {
      "type": "boolean",
      "label": "评论审核",
      "description": "是否需要审核评论",
      "default": false
    },
    "theme": {
      "type": "select",
      "label": "主题风格",
      "description": "选择主题风格",
      "default": "light",
      "options": [
        { "label": "浅色", "value": "light" },
        { "label": "深色", "value": "dark" },
        { "label": "自动", "value": "auto" }
      ]
    },
    "footerText": {
      "type": "textarea",
      "label": "页脚文本",
      "description": "页脚显示的文本内容",
      "default": "© 2025 我的网站。保留所有权利。"
    }
  }
}
```

## 常见问题

### Q: 如何更新已安装的主题配置？

A: 重新上传相同 `themeId` 的配置文件，系统会自动更新。

### Q: 支持哪些文件格式？

A: 目前仅支持 JSON 格式的 `theme.config.json` 文件。

### Q: 如何删除主题？

A: 在主题管理页面点击删除按钮即可。

### Q: 可以同时激活多个主题吗？

A: 不可以，系统只允许激活一个主题。激活新主题会自动停用其他主题。

### Q: 如何获取当前激活的主题配置？

A: 前端可以调用 `GET /api/theme/active` 获取当前激活主题的配置。
