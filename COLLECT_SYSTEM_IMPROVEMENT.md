# 采集系统改进方案

## 1. 采集模板管理系统

### 1.1 数据库迁移 - 创建模板表

```sql
-- 采集模板表
CREATE TABLE IF NOT EXISTS `bb_collect_template` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL COMMENT '模板名称',
  `type` tinyint unsigned NOT NULL COMMENT '采集类型: 1=VOD, 2=Article, 3=Actor',
  `description` text COMMENT '模板描述',
  `config` json NOT NULL COMMENT '模板配置 (JSON)',
  `status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态: 0=禁用, 1=启用',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_type_status` (`type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='采集模板表';

-- 采集模板字段映射表
CREATE TABLE IF NOT EXISTS `bb_collect_template_field` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `template_id` int unsigned NOT NULL,
  `field_name` varchar(64) NOT NULL COMMENT '字段名',
  `xpath` varchar(255) NOT NULL COMMENT 'XPath 表达式',
  `regex` varchar(255) COMMENT '正则表达式',
  `sort` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_template_id` (`template_id`),
  FOREIGN KEY (`template_id`) REFERENCES `bb_collect_template` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='采集模板字段映射表';
```

### 1.2 采集类型定义

```typescript
// apps/api/src/modules/collect/types/collect-types.ts
export enum CollectType {
  VOD = 1,      // 视频
  ARTICLE = 2,  // 资讯
  ACTOR = 3,    // 演员
}

export interface CollectTemplate {
  id: number;
  name: string;
  type: CollectType;
  description: string;
  config: {
    listUrl: string;           // 列表页 URL 模式
    detailUrl: string;         // 详情页 URL 模式
    pagination: {
      pageParam: string;       // 分页参数名
      pageStart: number;       // 起始页码
    };
    fields: Record<string, {
      xpath: string;
      regex?: string;
      type?: 'string' | 'number' | 'array';
    }>;
  };
  status: number;
  createdAt: number;
  updatedAt: number;
}
```

## 2. 资讯采集实现

### 2.1 资讯采集服务

```typescript
// apps/api/src/modules/collect/article/collect-article.service.ts
@Injectable()
export class CollectArticleService {
  async collectArticles(sourceId: number, templateId: number) {
    // 1. 获取模板配置
    // 2. 获取列表页数据
    // 3. 解析文章列表
    // 4. 逐个采集详情
    // 5. 入库到 bb_article
  }

  async parseArticleDetail(html: string, template: CollectTemplate) {
    // 使用 cheerio 解析 HTML
    // 根据 XPath 和正则提取字段
    // 返回标准化的文章数据
  }
}
```

### 2.2 资讯入库 API

```typescript
// POST /api/receive/article
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

## 3. 演员采集实现

### 3.1 演员采集服务

```typescript
// apps/api/src/modules/collect/actor/collect-actor.service.ts
@Injectable()
export class CollectActorService {
  async collectActors(sourceId: number, templateId: number) {
    // 1. 获取模板配置
    // 2. 获取演员列表
    // 3. 解析演员信息
    // 4. 入库到 bb_actor
  }

  async parseActorDetail(html: string, template: CollectTemplate) {
    // 解析演员信息
    // 返回标准化的演员数据
  }
}
```

### 3.2 演员入库 API

```typescript
// POST /api/receive/actor
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

## 4. 模板管理 API

### 4.1 模板 CRUD 接口

```typescript
// GET /admin/collect/templates - 列表
// POST /admin/collect/templates - 新增
// PUT /admin/collect/templates/:id - 编辑
// DELETE /admin/collect/templates/:id - 删除
// GET /admin/collect/templates/:id - 详情

// 新增模板请求体
{
  "name": "模板名称",
  "type": 1,  // 1=VOD, 2=Article, 3=Actor
  "description": "模板描述",
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

### 4.2 模板测试 API

```typescript
// POST /admin/collect/templates/:id/test
// 测试模板是否能正确解析数据
{
  "testUrl": "http://example.com/test-page",
  "pageNum": 1
}

// 返回
{
  "ok": true,
  "preview": [
    {
      "title": "...",
      "url": "...",
      // 其他字段
    }
  ]
}
```

## 5. 前端界面需求

### 5.1 模板管理页面

- 模板列表（支持搜索、筛选）
- 新增模板按钮
- 编辑模板表单
- 删除模板确认
- 模板测试功能
- 字段映射编辑器

### 5.2 采集任务配置

- 选择采集类型（VOD/Article/Actor）
- 选择采集模板
- 配置采集源
- 设置采集规则

## 6. MacCMS 功能对标

| 功能 | MacCMS | 937CMS | 状态 |
|------|--------|--------|------|
| 视频采集 | ✅ | ✅ | 完成 |
| 资讯采集 | ✅ | ❌ | 待实现 |
| 演员采集 | ✅ | ❌ | 待实现 |
| 模板管理 | ✅ | ❌ | 待实现 |
| 模板编辑器 | ✅ | ❌ | 待实现 |
| 字段映射 | ✅ | ❌ | 待实现 |
| 采集预览 | ✅ | ❌ | 待实现 |

## 7. 实现优先级

1. **第一阶段**：创建模板管理系统（数据库 + API）
2. **第二阶段**：实现资讯采集
3. **第三阶段**：实现演员采集
4. **第四阶段**：前端界面开发

## 8. 初始化模板示例

系统应该提供几个内置模板供用户参考：

```sql
INSERT INTO `bb_collect_template` VALUES
(1, 'MacCMS VOD 模板', 1, '标准 MacCMS 视频采集模板', '{"listUrl":"...","fields":{...}}', 1, NOW(), NOW()),
(2, '通用资讯模板', 2, '通用资讯采集模板', '{"listUrl":"...","fields":{...}}', 1, NOW(), NOW()),
(3, '通用演员模板', 3, '通用演员采集模板', '{"listUrl":"...","fields":{...}}', 1, NOW(), NOW());
```

## 9. 用户使用流程

1. 进入"采集 → 模板管理"
2. 点击"新增模板"
3. 填写模板名称、类型、描述
4. 配置采集 URL 和字段映射
5. 点击"测试"验证模板
6. 保存模板
7. 在采集任务中选择该模板
8. 执行采集任务
