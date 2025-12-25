import { Injectable, Logger } from '@nestjs/common';
import { MySQLService } from './mysql.service';
import { RuntimeConfigService } from '../config/runtime-config.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 迁移记录类型
 */
type MigrationRecord = {
  version: string;
  name: string;
  sql: string;
};

/**
 * 获取当前时间戳（秒）
 */
function nowTs() {
  return Math.floor(Date.now() / 1000);
}

/**
 * 数据库迁移服务
 * 负责自动检测和执行数据库迁移脚本
 *
 * 迁移文件命名规则：
 * - 格式：{版本号}_{名称}.sql
 * - 示例：001_init.sql, 002_add_player_fields.sql
 * - 版本号必须是数字，按顺序执行
 */
@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  private readonly migrationsDir: string;

  constructor(
    private readonly db: MySQLService,
    private readonly cfg: RuntimeConfigService,
  ) {
    // 迁移文件目录 - 支持开发和生产环境
    // 开发环境: apps/api/src/db -> apps/api/sql/migrations
    // 生产环境: apps/api/dist/db -> apps/api/sql/migrations
    const srcDir = path.join(__dirname, '../../sql/migrations');
    const rootDir = path.join(process.cwd(), 'sql/migrations');
    this.migrationsDir = fs.existsSync(srcDir) ? srcDir : rootDir;
  }

  /**
   * 执行所有待执行的迁移
   * 使用支持多语句的独立连接执行迁移脚本
   */
  async runMigrations() {
    try {
      const pool = await this.db.getPoolAsync();

      // 确保迁移表存在
      await this.ensureMigrationTable();

      // 获取已执行的迁移
      const [executed] = await pool.query<any[]>('SELECT version FROM bb_migration ORDER BY version');
      const executedVersions = new Set((executed || []).map((r) => r.version));

      // 获取所有迁移文件
      const migrations = this.loadMigrationFiles();

      // 过滤出未执行的迁移
      const pending = migrations.filter((m) => !executedVersions.has(m.version));

      if (pending.length === 0) {
        this.logger.log('数据库已是最新版本');
        return { executed: 0 };
      }

      // 按版本号排序执行
      pending.sort((a, b) => a.version.localeCompare(b.version));

      let executedCount = 0;
      for (const migration of pending) {
        try {
          this.logger.log(`执行迁移: ${migration.version} - ${migration.name}`);

          // 执行迁移 SQL（使用多语句模式）
          await this.executeMigrationSql(migration.sql);

          // 记录迁移
          await pool.query(
            'INSERT INTO bb_migration (version, name, executed_at) VALUES (?, ?, ?)',
            [migration.version, migration.name, nowTs()],
          );

          executedCount++;
          this.logger.log(`迁移完成: ${migration.version}`);
        } catch (e) {
          this.logger.error(`迁移失败: ${migration.version}`, e);
          throw e;
        }
      }

      this.logger.log(`数据库迁移完成，共执行 ${executedCount} 个迁移`);
      return { executed: executedCount };
    } catch (error) {
      this.logger.warn('数据库迁移失败（可能是首次启动，配置未完成）', error);
      return { executed: 0 };
    }
  }

  /**
   * 使用支持多语句的连接执行迁移 SQL
   * 这样可以支持 PREPARE/EXECUTE 等复杂语句
   */
  private async executeMigrationSql(sql: string) {
    const mysql = await import('mysql2/promise');
    const config = this.cfg.read();

    if (!config) {
      throw new Error('Database config not available');
    }

    // 创建支持多语句的临时连接
    const conn = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      database: config.mysql.database,
      user: config.mysql.user,
      password: config.mysql.password,
      charset: 'utf8mb4',
      multipleStatements: true, // 关键：支持多语句
    });

    try {
      await conn.query(sql);
    } finally {
      await conn.end();
    }
  }

  /**
   * 确保迁移表存在
   */
  private async ensureMigrationTable() {
    try {
      const pool = await this.db.getPoolAsync();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bb_migration (
          id int unsigned NOT NULL AUTO_INCREMENT,
          version varchar(32) NOT NULL COMMENT '版本号',
          name varchar(128) NOT NULL COMMENT '迁移名称',
          executed_at int unsigned NOT NULL DEFAULT 0 COMMENT '执行时间',
          PRIMARY KEY (id),
          UNIQUE KEY uniq_version (version)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据库迁移记录表'
      `);
    } catch (error) {
      this.logger.warn('创建迁移表失败', error);
    }
  }

  /**
   * 加载所有迁移文件
   */
  private loadMigrationFiles(): MigrationRecord[] {
    const migrations: MigrationRecord[] = [];

    // 检查目录是否存在
    if (!fs.existsSync(this.migrationsDir)) {
      this.logger.warn(`迁移目录不存在: ${this.migrationsDir}`);
      return migrations;
    }

    // 读取所有 .sql 文件
    const files = fs.readdirSync(this.migrationsDir).filter((f) => f.endsWith('.sql'));

    for (const file of files) {
      // 解析文件名：001_init.sql -> version=001, name=init
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        this.logger.warn(`跳过无效的迁移文件: ${file}`);
        continue;
      }

      const version = match[1];
      const name = match[2];
      const filePath = path.join(this.migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      migrations.push({ version, name, sql });
    }

    return migrations;
  }

  /**
   * 获取当前数据库版本
   */
  async getCurrentVersion(): Promise<string | null> {
    try {
      const pool = await this.db.getPoolAsync();
      const [rows] = await pool.query<any[]>(
        'SELECT version FROM bb_migration ORDER BY version DESC LIMIT 1',
      );
      return rows?.[0]?.version || null;
    } catch {
      return null;
    }
  }

  /**
   * 获取迁移历史
   */
  async getMigrationHistory() {
    try {
      const pool = await this.db.getPoolAsync();
      const [rows] = await pool.query<any[]>(
        'SELECT version, name, executed_at FROM bb_migration ORDER BY version ASC',
      );
      return rows || [];
    } catch {
      return [];
    }
  }
}
