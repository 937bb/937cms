import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { loadEnv } from '../../env';
import { RuntimeConfigService, type RuntimeConfigV1 } from '../../config/runtime-config.service';

/**
 * 系统版本号
 * 每次发布新版本时更新此值
 */
export const SYSTEM_VERSION = '1.0.0';

function nowTs() {
  return Math.floor(Date.now() / 1000);
}

function trim(v: unknown) {
  return String(v ?? '').trim();
}

function requiredStr(v: unknown, name: string, min = 1) {
  const s = trim(v);
  if (s.length < min) throw new BadRequestException(`${name} too short`);
  return s;
}

function requiredInt(v: unknown, name: string, min = 1, max = 65535) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new BadRequestException(`${name} invalid`);
  return Math.floor(n);
}

function splitSQL(sqlText: string) {
  const statements: string[] = [];
  let buf = '';
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sqlText.length; i++) {
    const ch = sqlText[i];
    const next = sqlText[i + 1];

    if (!inSingle && !inDouble && !inBlockComment && ch === '-' && next === '-') {
      inLineComment = true;
    }
    if (!inSingle && !inDouble && !inLineComment && ch === '/' && next === '*') {
      inBlockComment = true;
    }

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      buf += ch;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        buf += '*/';
        i++;
      } else {
        buf += ch;
      }
      continue;
    }

    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (ch === '"' && !inSingle) inDouble = !inDouble;

    if (ch === ';' && !inSingle && !inDouble) {
      const stmt = buf.trim();
      if (stmt) statements.push(stmt);
      buf = '';
      continue;
    }
    buf += ch;
  }
  const tail = buf.trim();
  if (tail) statements.push(tail);
  return statements;
}

export type SetupInput = {
  // MySQL runtime (API will use these after restart)
  mysqlHost: string;
  mysqlPort: number;
  mysqlDatabase: string;
  mysqlUser: string;
  mysqlPassword: string;
  mysqlCreateDatabase?: boolean;

  // CMS security + admin (always required)
  adminUser: string;
  adminPassword: string;
  siteName?: string;

  // 是否覆盖数据库（单选：true=覆盖，false=保留）
  overwriteDatabase?: boolean;

  // Optional secrets; if omitted, server will generate and write to config file.
  adminJwtSecret?: string;
  memberJwtSecret?: string;
  collectorWorkerToken?: string;
};

function randHex(n = 32) {
  const bytes = Math.ceil(n / 2);
  return randomBytes(bytes).toString('hex').slice(0, n);
}

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);

  constructor(private readonly cfg: RuntimeConfigService) {}

  /**
   * 获取系统安装状态
   * 返回是否已配置、是否需要重启、系统版本等信息
   */
  async status() {
    const configured = this.cfg.exists();
    const bootConfigured = String(process.env.CMS_BOOT_CONFIGURED || '') === '1';
    const dirChecks = await this.checkDirectories();
    return {
      configured,
      needsRestart: configured && !bootConfigured,
      version: SYSTEM_VERSION,
      directories: dirChecks,
    };
  }

  /**
   * 检测关键目录的读写权限
   */
  private async checkDirectories() {
    const dataDir = path.join(process.cwd(), 'data');
    const uploadsDir = path.join(dataDir, 'uploads');
    const results: { path: string; writable: boolean; error?: string }[] = [];

    for (const dir of [dataDir, uploadsDir]) {
      try {
        await fs.mkdir(dir, { recursive: true });
        const testFile = path.join(dir, `.write-test-${Date.now()}`);
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        results.push({ path: dir, writable: true });
      } catch (e: any) {
        results.push({ path: dir, writable: false, error: e.message });
      }
    }
    return results;
  }

  async run(input: SetupInput) {
    const overwriteDatabase = Boolean(input.overwriteDatabase);
    if (this.cfg.exists() && !overwriteDatabase) throw new BadRequestException('already configured, use overwriteDatabase to reinit');

    const mysqlHost = requiredStr(input.mysqlHost, 'mysqlHost', 1);
    const mysqlPort = requiredInt(input.mysqlPort, 'mysqlPort', 1);
    const mysqlDatabase = requiredStr(input.mysqlDatabase, 'mysqlDatabase', 1);
    const mysqlUser = requiredStr(input.mysqlUser, 'mysqlUser', 1);
    const mysqlPassword = requiredStr(input.mysqlPassword, 'mysqlPassword', 1);
    const mysqlCreateDatabase = Boolean(input.mysqlCreateDatabase);

    // 管理员信息始终必须
    const adminUser = requiredStr(input.adminUser, 'adminUser', 3);
    const adminPassword = requiredStr(input.adminPassword, 'adminPassword', 6);
    const interfacePass = randHex(24);

    const adminJwtSecret = trim(input.adminJwtSecret) || randHex(48);
    const memberJwtSecret = trim(input.memberJwtSecret) || randHex(48);
    const collectorWorkerToken = trim(input.collectorWorkerToken) || randHex(40);

    if (adminJwtSecret.length < 16) throw new BadRequestException('adminJwtSecret too short');
    if (memberJwtSecret.length < 16) throw new BadRequestException('memberJwtSecret too short');
    if (collectorWorkerToken.length < 16) throw new BadRequestException('collectorWorkerToken too short');

    const config: RuntimeConfigV1 = {
      version: 1,
      mysql: { host: mysqlHost, port: mysqlPort, database: mysqlDatabase, user: mysqlUser, password: mysqlPassword },
      security: {
        interfacePass,
        adminJwtSecret,
        memberJwtSecret,
        collectorWorkerToken,
      },
      site: {
        siteName: trim(input.siteName || ''),
      },
    };

    // 1) Connect MySQL server (optionally create DB)
    const serverConn = await mysql.createConnection({
      host: mysqlHost,
      port: mysqlPort,
      user: mysqlUser,
      password: mysqlPassword,
      multipleStatements: true,
    });

    try {
      if (mysqlCreateDatabase) {
        await serverConn.query(
          `CREATE DATABASE IF NOT EXISTS \`${mysqlDatabase}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        );
      }
    } finally {
      await serverConn.end();
    }

    // 2) Apply schema
    const dbConn = await mysql.createConnection({
      host: mysqlHost,
      port: mysqlPort,
      user: mysqlUser,
      password: mysqlPassword,
      database: mysqlDatabase,
      multipleStatements: true,
    });

    try {
      const schemaPath = path.join(process.cwd(), 'sql', 'schema.sql');
      const schemaSQL = await fs.readFile(schemaPath, 'utf8');
      const statements = splitSQL(schemaSQL).filter(Boolean);
      for (const stmt of statements) {
        const t = stmt.trim();
        if (!t) continue;
        await dbConn.query(t);
      }

      // 3) Seed admin + defaults
      const [adminCountRows] = await dbConn.query<any[]>('SELECT COUNT(1) as c FROM bb_admin');
      const adminCount = Number((adminCountRows as any)?.[0]?.c || 0);

      const now = nowTs();

      // 创建或更新管理员
      if (adminCount === 0) {
        // 第一次初始化：创建管理员
        const hash = await bcrypt.hash(adminPassword, 10);
        await dbConn.query('INSERT INTO bb_admin (username, password_hash, role, created_at, updated_at) VALUES (?,?,?,?,?)', [
          adminUser,
          hash,
          'owner',
          now,
          now,
        ]);
      } else if (overwriteDatabase) {
        // 覆盖数据库模式：更新管理员密码
        const hash = await bcrypt.hash(adminPassword, 10);
        await dbConn.query('UPDATE bb_admin SET password_hash = ?, updated_at = ? WHERE role = ?', [hash, now, 'owner']);
      }

      await dbConn.query(
        'INSERT INTO bb_member_group (id, name, remark, level, status, created_at, updated_at) VALUES (1,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
        ['默认会员', 'Default group', 0, 1, now, now],
      );

      await dbConn.query(
        'INSERT INTO bb_setting (`key`, value_json, updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value_json=VALUES(value_json), updated_at=VALUES(updated_at)',
        [
          'system',
          JSON.stringify({
            interfacePass,
            siteName: trim(input.siteName || ''),
          }),
          now,
        ],
      );

      await dbConn.query(
        'INSERT INTO bb_setting (`key`, value_json, updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value_json=VALUES(value_json), updated_at=VALUES(updated_at)',
        [
          'site',
          JSON.stringify({
            siteName: trim(input.siteName || ''),
            searchPlaceholder: '搜索影片...',
            searchHot: '',
          }),
          now,
        ],
      );

      // 4) 记录安装信息
      await dbConn.query(
        'INSERT INTO bb_install (`key`, value, updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value=VALUES(value), updated_at=VALUES(updated_at)',
        ['version', SYSTEM_VERSION, now],
      );
      await dbConn.query(
        'INSERT INTO bb_install (`key`, value, updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value=VALUES(value), updated_at=VALUES(updated_at)',
        ['installed_at', String(now), now],
      );

      // 5) 记录初始迁移版本（schema.sql 对应 000 版本）
      await dbConn.query(
        'INSERT IGNORE INTO bb_migration (version, name, executed_at) VALUES (?,?,?)',
        ['000', 'initial_schema', now],
      );
    } finally {
      await dbConn.end();
    }

    // 6) Persist runtime config (atomic)
    this.cfg.write(config);

    const env = loadEnv();
    const restartRequired = true;
    if (env.CMS_AUTO_RESTART_AFTER_SETUP) {
      setTimeout(() => process.exit(0), 200);
    }

    this.logger.log(`系统安装完成，版本: ${SYSTEM_VERSION}`);
    return { ok: true, restartRequired, interfacePass, version: SYSTEM_VERSION };
  }

  /**
   * 获取系统信息（用于后台显示）
   */
  async getSystemInfo() {
    return {
      version: SYSTEM_VERSION,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }

  /**
   * 测试 MySQL 连接
   */
  async testMysql(input: { host: string; port: number; user: string; password: string; database?: string }) {
    const host = requiredStr(input.host, 'host');
    const port = requiredInt(input.port, 'port', 1);
    const user = requiredStr(input.user, 'user');
    const password = trim(input.password);

    try {
      const conn = await mysql.createConnection({
        host,
        port,
        user,
        password,
        database: input.database || undefined,
        connectTimeout: 5000,
      });
      await conn.ping();
      await conn.end();
      return { ok: true, message: 'MySQL 连接成功' };
    } catch (e: any) {
      return { ok: false, message: `MySQL 连接失败: ${e.message || e}` };
    }
  }

  /**
   * 测试 Redis 连接
   */
  async testRedis(input: { host: string; port: number; password?: string }) {
    const host = requiredStr(input.host, 'host');
    const port = requiredInt(input.port, 'port', 1);
    const password = trim(input.password || '');

    try {
      const { default: Redis } = await import('ioredis');
      const client = new (Redis as any)({
        host,
        port,
        password: password || undefined,
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });

      return new Promise<{ ok: boolean; message: string }>((resolve) => {
        const timeout = setTimeout(() => {
          client.disconnect();
          resolve({ ok: false, message: 'Redis 连接超时' });
        }, 5000);

        client.on('ready', async () => {
          clearTimeout(timeout);
          await client.quit();
          resolve({ ok: true, message: 'Redis 连接成功' });
        });

        client.on('error', (err) => {
          clearTimeout(timeout);
          client.disconnect();
          resolve({ ok: false, message: `Redis 连接失败: ${err.message || err}` });
        });
      });
    } catch (e: any) {
      return { ok: false, message: `Redis 连接失败: ${e.message || e}` };
    }
  }
}
