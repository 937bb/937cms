# 937-CMS API 服务

基于 NestJS 构建的 CMS 后端 API 服务。

## 环境要求

- Node.js >= 18
- MySQL >= 5.7
- Redis >= 6.0

## 安装依赖

```bash
pnpm install
```

## 配置

复制环境变量示例文件并修改配置：

```bash
cp .env.example .env
```

## 数据库初始化

```bash
# 创建数据库和表结构
pnpm db:init

# 初始化种子数据
pnpm db:seed
```

## 启动服务

```bash
# 开发模式
pnpm start:dev

# 生产模式
pnpm start:prod
```

## 目录结构

```
src/
├── modules/          # 业务模块
│   ├── admin/        # 管理后台接口
│   ├── api/          # 公共 API 接口
│   └── receive/      # 采集接收接口
├── entities/         # 数据库实体
├── common/           # 公共模块
└── main.ts           # 入口文件
```

## data 目录说明

`data/` 目录存储运行时数据：
- `runtime-config.json` - 运行时配置（数据库连接、密钥等）
- `cms.db` - SQLite 数据库（如使用）
- `uploads/` - 上传文件目录

删除 `data/` 目录下的文件可重置项目到初始状态。
