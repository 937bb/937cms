# 937 CMS (WIP)

目标：替代传统 PHP CMS 的「视频入库 + 对外开放 API + 后台管理 API」，并支持第三方 Nuxt 模板自行实现前端与独立管理页。

## 目录结构

- `apps/api`：NestJS（管理 API + 开放 API + 入库接口）
- `apps/admin`：React + Ant Design（CMS 管理后台 UI）
- `apps/web`：Nuxt（默认前台模板示例）
- `docs`：API 约定与前端对接说明

## 快速开始（本地）

1. 启动依赖（MySQL/Redis）
   - `docker compose up -d`
2. 启动全套（API+Admin+Web）
   - `./scripts/dev.sh`
3. 首次初始化（浏览器）
   - 打开 Admin UI：`http://localhost:5173/setup`
   - 填写 MySQL 账号密码并初始化（成功后重启 API，再登录）

启动后：
- Swagger：`http://localhost:3000/docs`
- Admin UI（默认）：`http://localhost:5173`
- Web（默认）：`http://localhost:3001`

采集（Go）：
- Go 采集器源码在 `apps/collector`，由 NestJS 自动拉起执行（无需单独运行）

## 一键脚本

- 启动依赖（MySQL/Redis）：`./scripts/init.sh`
- 启动全套（API+Admin+Web）：`./scripts/dev.sh`
