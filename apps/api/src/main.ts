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

  // Register global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Register security headers middleware
  app.use(new SecurityHeadersMiddleware().use.bind(new SecurityHeadersMiddleware()));

  // Register HTTP logging middleware
  app.use(new HttpLoggingMiddleware().use.bind(new HttpLoggingMiddleware()));

  // Allow urlencoded bodies for receive endpoints compatibility.
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Route aliases (public/admin)
  // Internal, hard-coded controller prefixes:
  const PUBLIC_INTERNAL = '/api/v1';
  const ADMIN_INTERNAL = '/admin';
  // Exposed prefixes:
  const publicExpose = normalizePrefix(env.CMS_PUBLIC_API_PREFIX, '/api/public');
  const adminExpose = normalizePrefix(env.CMS_ADMIN_API_PREFIX, '/admin');

  app.use((req, res, next) => {
    const url = String(req.url || '');

    // Optional: hide default /api/v1/* when exposing /api/public/*
    if (env.CMS_PUBLIC_API_DISABLE_V1 && publicExpose !== PUBLIC_INTERNAL && isUnderPrefix(url, PUBLIC_INTERNAL)) {
      res.status(404).send('Not Found');
      return;
    }

    // Optional: hide default /admin/* when exposing custom admin prefix
    if (env.CMS_ADMIN_API_DISABLE_DEFAULT && adminExpose !== ADMIN_INTERNAL && isUnderPrefix(url, ADMIN_INTERNAL)) {
      res.status(404).send('Not Found');
      return;
    }

    // Rewrite exposed prefixes -> internal prefixes (so controllers stay unchanged)
    if (publicExpose !== PUBLIC_INTERNAL && isUnderPrefix(url, publicExpose)) {
      req.url = `${PUBLIC_INTERNAL}${url.slice(publicExpose.length)}`;
    } else if (adminExpose !== ADMIN_INTERNAL && isUnderPrefix(url, adminExpose)) {
      req.url = `${ADMIN_INTERNAL}${url.slice(adminExpose.length)}`;
    }

    next();
  });

  // Serve uploads (optional image sync)
  const dataDir = path.resolve(env.CMS_DATA_DIR || path.join(process.cwd(), 'data'));
  app.use('/uploads', express.static(path.join(dataDir, 'uploads')));

  // Serve admin console (built frontend). API routes keep using `/admin/*`.
  // Console is mounted at `/console/*` to avoid path conflict with API.
  try {
    const adminDist = path.resolve(process.cwd(), '..', 'admin', 'dist');
    const adminIndex = path.join(adminDist, 'index.html');
    if (fs.existsSync(adminIndex)) {
      app.use('/console', express.static(adminDist));
      app.use(/^\/console(\/.*)?$/, (req, res) => res.sendFile(adminIndex));
    }
  } catch {
    // ignore
  }

  // Hard-limit HTTP methods to reduce exposed surface area.
  // Note: keep OPTIONS for CORS preflight (respond fast), otherwise cross-origin requests will fail.
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

  // Run pending migrations if system is configured
  if (bootConfigured) {
    try {
      const migrationService = app.get(MigrationService);
      await migrationService.runMigrations();
    } catch (e) {
      console.warn('Migration execution failed:', e);
    }
  }

  await app.listen(env.PORT);
}
bootstrap();
