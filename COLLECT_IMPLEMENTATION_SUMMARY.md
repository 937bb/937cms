# 采集系统改进 - 实现总结

## 已完成

### 1. 数据库迁移
- ✅ 创建 `bb_collect_template` 表（模板管理）
- ✅ 创建 `bb_collect_template_field` 表（字段映射）
- ✅ 插入 3 个初始模板（VOD、Article、Actor）

**迁移文件**: `apps/api/sql/migrations/006_create_collect_template.sql`

### 2. 模板管理系统
- ✅ `CollectTemplateService` - 模板 CRUD 操作
- ✅ `CollectTemplateController` - 模板管理 API
- ✅ 类型定义和接口

**文件**:
- `apps/api/src/modules/collect/template/collect-template.service.ts`
- `apps/api/src/modules/collect/template/collect-template.controller.ts`

### 3. 资讯采集框架
- ✅ `CollectArticleService` - 资讯采集服务
- ✅ 资讯入库接口定义

**文件**: `apps/api/src/modules/collect/article/collect-article.service.ts`

### 4. 演员采集框架
- ✅ `CollectActorService` - 演员采集服务
- ✅ 演员入库接口定义

**文件**: `apps/api/src/modules/collect/actor/collect-actor.service.ts`

## API 端点

### 模板管理 API

```
GET    /admin/collect/templates           - 获取模板列表
GET    /admin/collect/templates/:id       - 获取模板详情
POST   /admin/collect/templates           - 新增模板
PUT    /admin/collect/templates/:id       - 编辑模板
DELETE /admin/collect/templates/:id       - 删除模板
POST   /admin/collect/templates/:id/test  - 测试模板
```

### 新增模板请求示例

```json
{
  "name": "MacCMS VOD 模板",
  "type": 1,
  "description": "标准 MacCMS 视频采集模板",
  "config": {
    "listUrl": "http://example.com/list?page={page}",
    "detailUrl": "http://example.com/detail/{id}",
    "pagination": {
      "pageParam": "page",
      "pageStart": 1
    },
    "fields": {
      "title": {
        "xpath": "//h1[@class='title']",
        "type": "string"
      },
      "items": {
        "xpath": "//div[@class='item']",
        "type": "array"
      }
    }
  },
  "status": 1
}
```

## 待实现功能

### 1. 模板测试功能
- 实现 `POST /admin/collect/templates/:id/test`
- 使用 cheerio 解析 HTML
- 根据 XPath 提取数据
- 返回预览数据

### 2. 资讯采集完整实现
- 实现 `collectArticles()` 方法
- 支持列表页分页
- 支持详情页采集
- 支持字段映射和正则提取

### 3. 演员采集完整实现
- 实现 `collectActors()` 方法
- 支持演员列表采集
- 支持演员详情采集

### 4. 资讯入库 API
```
POST /api/receive/article
{
  "pass": "interface_password",
  "source_id": 1,
  "article_title": "文章标题",
  "article_content": "文章内容",
  "article_pic": "http://...",
  "article_time": 1234567890,
  "article_status": 1
}
```

### 5. 演员入库 API
```
POST /api/receive/actor
{
  "pass": "interface_password",
  "source_id": 1,
  "actor_name": "演员名称",
  "actor_pic": "http://...",
  "actor_area": "中国",
  "actor_sex": 1,
  "actor_status": 1
}
```

### 6. 前端界面
- 模板管理页面
- 模板编辑表单
- 字段映射编辑器
- 模板测试预览

## 用户使用流程

### 添加新模板

1. 进入管理后台 → 采集 → 模板管理
2. 点击"新增模板"按钮
3. 填写模板信息：
   - 模板名称
   - 采集类型（VOD/资讯/演员）
   - 模板描述
4. 配置采集规则：
   - 列表页 URL
   - 详情页 URL
   - 分页参数
   - 字段映射（XPath + 正则）
5. 点击"测试"验证模板
6. 保存模板

### 使用模板采集

1. 进入采集 → 采集任务
2. 新增采集任务
3. 选择采集类型和模板
4. 选择采集源
5. 执行采集

## 对标 MacCMS 功能

| 功能 | MacCMS | 937CMS | 状态 |
|------|--------|--------|------|
| 视频采集 | ✅ | ✅ | 完成 |
| 资讯采集 | ✅ | 🔄 | 框架完成，待实现 |
| 演员采集 | ✅ | 🔄 | 框架完成，待实现 |
| 模板管理 | ✅ | ✅ | 完成 |
| 模板编辑器 | ✅ | 🔄 | 待实现 |
| 字段映射 | ✅ | ✅ | 完成 |
| 采集预览 | ✅ | 🔄 | 待实现 |

## 下一步

1. **集成到 CollectModule**
   - 在 `collect.module.ts` 中注册新的服务和控制器
   - 更新模块导出

2. **实现采集逻辑**
   - 完成资讯采集的 HTML 解析
   - 完成演员采集的 HTML 解析
   - 支持 XPath 和正则表达式提取

3. **前端开发**
   - 创建模板管理页面
   - 创建模板编辑表单
   - 实现模板测试功能

4. **测试**
   - 单元测试
   - 集成测试
   - 端到端测试
