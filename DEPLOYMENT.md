# 部署文档

## 项目结构

```
937-cms/
├── apps/
│   ├── api/          # NestJS 后端 API
│   ├── web/          # Nuxt 前端（用户端）
│   └── admin/        # Vue 管理后台
└── ...
```

## 部署流程

### 第一步：启动 API

```bash
cd apps/api

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，配置数据库、Redis 等

# 3. 启动 API（开发环境）
npm run start:dev

# 或生产环境
npm run build
npm run start
```

**API 访问地址：** `http://localhost:3000`

---

### 第二步：配置 Admin 环境变量

```bash
cd apps/admin

# 1. 创建 .env 文件
cp .env.example .env

# 2. 编辑 .env
# VITE_API_BASE_URL=http://localhost:3000
# VITE_ADMIN_API_PREFIX=/admin
```

---

### 第三步：启动 Admin（首次初始化）

```bash
cd apps/admin

# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
```

**Admin 访问地址：** `http://localhost:5173`

**首次启动会自动跳转到初始化页面：**
- 配置 MySQL 连接信息
- 配置 Redis（可选）
- 创建管理员账号
- 点击「开始初始化」

**初始化完成后：**
- 如果提示「需要重启 API」，则停止并重新启动 API
- 然后点击「我已重启，去登录」
- 使用创建的管理员账号登录

---

### 第四步：启动 Web（Nuxt 前端）

```bash
cd web

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，配置 API_KEY

# 3. 启动开发服务器
npm run dev

# 或生产环境
npm run build
npm run preview
```

**Web 访问地址：** `http://localhost:3001`

---

## 完整部署顺序

```
1. 启动 API (npm run start:dev)
   ↓
2. 启动 Admin (npm run dev)
   ↓
3. 在 Admin 初始化页面配置数据库
   ↓
4. 重启 API（如需要）
   ↓
5. 启动 Web (npm run dev)
```

---

## 环境变量配置

### API (.env)
```
PORT=3000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=bb_cms
MYSQL_USER=bb
MYSQL_PASSWORD=bb
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
SESSION_TOKEN_SECRET=your-secret-key-32-chars-minimum-here
JWT_SECRET=your-jwt-secret-32-chars-minimum
```

### Admin (.env)
```
VITE_API_BASE_URL=http://localhost:3000
VITE_ADMIN_API_PREFIX=/admin
```

### Web (.env)
```
VITE_API_URL=http://localhost:3000
VITE_API_KEY=ffc01bbb2515ff3f8de91ca7ebdf25f825ff7b754c3f53554c6881cabdc19b97
```

---

## 生产环境部署

### 使用 PM2 管理进程

```bash
npm install -g pm2

# 启动 API
pm2 start "npm run start" --name "api" --cwd /path/to/apps/api

# 启动 Admin
pm2 start "npm run preview" --name "admin" --cwd /path/to/apps/admin

# 启动 Web
pm2 start "npm run preview" --name "web" --cwd /path/to/apps/web

# 保存配置
pm2 save
pm2 startup
```

### 使用 Nginx 反向代理

```nginx
upstream api {
  server localhost:3000;
}

upstream admin {
  server localhost:5173;
}

upstream web {
  server localhost:3001;
}

server {
  listen 80;
  server_name example.com;

  # API
  location /api {
    proxy_pass http://api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # Admin
  location /admin {
    proxy_pass http://admin;
    proxy_set_header Host $host;
  }

  # Web
  location / {
    proxy_pass http://web;
    proxy_set_header Host $host;
  }
}
```

### 使用 SSL 证书

```bash
# 使用 Let's Encrypt
certbot certonly --standalone -d example.com

# 在 Nginx 配置中启用 HTTPS
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
```

---

## 数据库备份

```bash
# 备份
mysqldump -u bb -p bb_cms > backup.sql

# 恢复
mysql -u bb -p bb_cms < backup.sql
```

---

## 常见问题

### 1. Admin 初始化时提示「需要重启 API」
- 停止 API 进程
- 重新启动 API
- 返回 Admin 页面点击「我已重启，去登录」

### 2. Web 无法获取 Token
- 检查 API Key 是否正确配置在 Web 的 .env 中
- 确保 API 已启动并正常运行
- 检查 API 的 SESSION_TOKEN_SECRET 是否已配置

### 3. Admin 无法连接 API
- 检查 VITE_API_BASE_URL 是否正确
- 确保 API 已启动
- 检查防火墙设置
