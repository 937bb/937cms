import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { loadEnv } from './env';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { HttpLoggingMiddleware } from './common/middleware/http-logging.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { MigrationService } from './db/migration.service';

function normalizePrefix(raw: string, fallback: string) {
  const v = String(raw || '').trim() || fallback;
  if (v === '/') return '/';
  const withSlash = v.startsWith('/') ? v : `/${v}`;
  return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

function isUnderPrefix(url: string, prefix: string) {
  return url === prefix || url.startsWith(`${prefix}/`);
}

function configExists() {
  const env = loadEnv();
  const dir = path.resolve(env.CMS_DATA_DIR || path.join(process.cwd(), 'data'));
  const cfgPath = path.join(dir, 'runtime-config.json');
  try {
    return fs.existsSync(cfgPath);
  } catch {
    return false;
  }
}

async function bootstrap() {
  const env = loadEnv();
  const bootConfigured = configExists();
  process.env.CMS_BOOT_CONFIGURED = bootConfigured ? '1' : '0';

  const app = await NestFactory.create(AppModule.forRoot({ configured: bootConfigured }));

  // 注册全局异常过滤器
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 注册安全头中间件
  app.use(new SecurityHeadersMiddleware().use.bind(new SecurityHeadersMiddleware()));

  // 注册 HTTP 日志中间件
  app.use(new HttpLoggingMiddleware().use.bind(new HttpLoggingMiddleware()));

  // 允许 urlencoded 请求体，用于接收端点兼容性
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // 路由别名（公开/管理）
  // 内部硬编码的控制器前缀：
  const PUBLIC_INTERNAL = '/api/v1';
  const ADMIN_INTERNAL = '/admin';
  // 暴露的前缀：
  const publicExpose = normalizePrefix(env.CMS_PUBLIC_API_PREFIX, '/api/public');
  const adminExpose = normalizePrefix(env.CMS_ADMIN_API_PREFIX, '/admin');

  app.use((req, res, next) => {
    const url = String(req.url || '');

    // 可选：当暴露 /api/public/* 时隐藏默认的 /api/v1/*
    if (env.CMS_PUBLIC_API_DISABLE_V1 && publicExpose !== PUBLIC_INTERNAL && isUnderPrefix(url, PUBLIC_INTERNAL)) {
      res.status(404).send('Not Found');
      return;
    }

    // 可选：当暴露自定义管理前缀时隐藏默认的 /admin/*
    if (env.CMS_ADMIN_API_DISABLE_DEFAULT && adminExpose !== ADMIN_INTERNAL && isUnderPrefix(url, ADMIN_INTERNAL)) {
      res.status(404).send('Not Found');
      return;
    }

    // 重写暴露的前缀 -> 内部前缀（保持控制器不变）
    if (publicExpose !== PUBLIC_INTERNAL && isUnderPrefix(url, publicExpose)) {
      req.url = `${PUBLIC_INTERNAL}${url.slice(publicExpose.length)}`;
    } else if (adminExpose !== ADMIN_INTERNAL && isUnderPrefix(url, adminExpose)) {
      req.url = `${ADMIN_INTERNAL}${url.slice(adminExpose.length)}`;
    }

    next();
  });

  // 提供上传文件服务（可选的图片同步）
  const dataDir = path.resolve(env.CMS_DATA_DIR || path.join(process.cwd(), 'data'));
  app.use('/uploads', express.static(path.join(dataDir, 'uploads')));

  // 提供主题文件服务
  app.use('/themes', express.static(path.join(dataDir, 'themes')));

  // 提供管理后台（已构建的前端）。API 路由继续使用 `/admin/*`。
  // 后台挂载在 `/console/*` 以避免与 API 路径冲突。
  try {
    const adminDist = path.resolve(process.cwd(), '..', 'admin', 'dist');
    const adminIndex = path.join(adminDist, 'index.html');
    if (fs.existsSync(adminIndex)) {
      app.use('/console', express.static(adminDist));
      app.use(/^\/console(\/.*)?$/, (req, res) => res.sendFile(adminIndex));
    }
  } catch {
    // 忽略
  }

  // 严格限制 HTTP 方法以减少暴露的表面积。
  // 注意：保留 OPTIONS 用于 CORS 预检（快速响应），否则跨域请求会失败。
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-session-token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    const method = String(req.method || '').toUpperCase();
    if (method === 'OPTIONS') {
      res.setHeader('Allow', 'GET, POST, OPTIONS');
      res.status(204).end();
      return;
    }
    if (method !== 'GET' && method !== 'POST') {
      res.setHeader('Allow', 'GET, POST, OPTIONS');
      res.status(405).send('Method Not Allowed');
      return;
    }
    next();
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('937 CMS API')
    .setDescription('CMS 管理 API + 开放 API（草案）')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // 如果系统已配置，执行待执行的迁移
  if (bootConfigured) {
    try {
      const migrationService = app.get(MigrationService);
      await migrationService.runMigrations();
    } catch (e) {
      console.warn('迁移执行失败：', e);
    }
  }

  await app.listen(env.PORT);
}
bootstrap();
