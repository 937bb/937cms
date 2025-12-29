# 937 CMS

> 一个现代化的视频 CMS 系统，替代传统 PHP CMS，提供完整的视频入库、API 接口和后台管理功能。

目标：替代传统 PHP CMS 的「视频入库 + 对外开放 API + 后台管理 API」，并支持第三方 Nuxt 模板自行实现前端与独立管理页。

## 📋 目录结构

- `apps/api`：NestJS（管理 API + 开放 API + 入库接口）
- `apps/admin`：Vue 3 + Naive UI（CMS 管理后台 UI）
- `apps/web`：Nuxt（默认前台模板示例）
- `apps/collector`：Go（采集器，自动拉起执行）
- `docs`：API 约定与前端对接说明

## 🚀 快速开始（本地）

### 前置要求
- Docker & Docker Compose
- Node.js 16+
- Go 1.18+

### 启动步骤

1. **启动依赖（MySQL/Redis）**
   ```bash
   docker compose up -d
   ```

2. **启动全套（API+Admin+Web）**
   ```bash
   ./scripts/dev.sh
   ```

3. **首次初始化（浏览器）**
   - 打开 Admin UI：`http://localhost:5173/setup`
   - 填写 MySQL 账号密码并初始化
   - 成功后重启 API，再登录

### 启动后访问地址

- **Swagger API 文档**：`http://localhost:3000/docs`
- **Admin UI（管理后台）**：`http://localhost:5173`
- **Web（前台）**：`http://localhost:3001`

## ✨ 核心功能

### 采集系统
- **采集任务管理**：创建、编辑、删除采集任务
- **采集源管理**：支持多个采集源配置
- **采集记录**：实时显示采集进度、统计数据（推送、新增、更新、失败）
- **断点续采**：支持从失败/中断的源继续采集
- **错误处理**：单个源失败时自动标记任务失败，不影响其他源
- **多线程采集**：支持并发采集和推送

### Redis 缓存配置
- **模块化缓存**：支持 5 个缓存模块（vodQuery、search、theme、config、types）
- **可配置 TTL**：每个模块独立设置缓存时间
- **启用/禁用开关**：灵活控制各模块缓存

### 会员系统
- 会员组管理（游客、普通会员、VIP）
- 会员信息管理
- 播放历史记录
- 收藏功能

### 视频管理
- 视频信息管理
- 多播放源支持
- 多剧集管理
- 下载源管理

## 🛠️ 一键脚本

```bash
# 启动依赖（MySQL/Redis）
./scripts/init.sh

# 启动全套（API+Admin+Web）
./scripts/dev.sh
```

## 🔧 采集器（Go）

Go 采集器源码在 `apps/collector`，由 NestJS 自动拉起执行（无需单独运行）。

**特性：**
- 支持多线程并发采集
- 支持断点续采（从上次中断位置继续）
- 自动错误处理和重试
- 支持关键词过滤
- 支持多个采集源并发处理

## 💻 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | NestJS + MySQL + Redis |
| **管理后台** | Vue 3 + Naive UI + TypeScript |
| **前台** | Nuxt 3 |
| **采集器** | Go |
| **数据库** | MySQL 8.0+ |
| **缓存** | Redis 6.0+ |

## 📦 项目结构

```
937-cms/
├── apps/
│   ├── api/              # NestJS 后端
│   ├── admin/            # Vue 3 管理后台
│   ├── web/              # Nuxt 前台
│   └── collector/        # Go 采集器
├── docs/                 # API 文档
├── scripts/              # 启动脚本
└── schema.sql            # 数据库架构
```

## 🔐 环境配置

### API 环境变量 (.env)

```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=cms_937

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# 服务
PORT=3000
NODE_ENV=development

# 采集器
COLLECTOR_WORKER_TOKEN=your_token_here
```

## 📝 API 文档

启动后访问 Swagger 文档：`http://localhost:3000/docs`

主要 API 端点：
- `/admin/*` - 管理后台 API
- `/api/*` - 开放 API
- `/collector/*` - 采集器 API

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 📞 联系方式

- 提交 Issue：[GitHub Issues](https://github.com/937bb/937cms/issues)
- 讨论：[GitHub Discussions](https://github.com/937bb/937cms/discussions)

## ⚠️ 免责声明

本项目仅供学习和研究使用。使用者需自行承担使用本项目代码的所有责任。

---

**最后更新**：2025-12-25


