import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import mysql, { Pool } from 'mysql2/promise';
import { RuntimeConfigService } from '../config/runtime-config.service';

@Injectable()
export class MySQLService implements OnModuleInit, OnModuleDestroy {
  private pool?: Pool;
  private readonly logger = new Logger(MySQLService.name);

  constructor(private readonly cfg: RuntimeConfigService) {}

  async onModuleInit() {
    // 如果配置存在，启动时自动连接
    if (this.cfg.exists()) {
      try {
        await this.ensureConnected();
      } catch (error) {
        this.logger.warn('Failed to connect to MySQL on startup', error);
      }
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  /**
   * 延迟初始化数据库连接
   * 在首次使用时自动连接，或通过 setup 时显式初始化
   */
  private async ensureConnected() {
    if (this.pool) return;

    const cfg = this.cfg.read();
    if (!cfg) {
      throw new Error('CMS not configured yet. Please visit /setup in Admin UI.');
    }

    this.logger.log(`Connecting to MySQL: ${cfg.mysql.host}:${cfg.mysql.port}/${cfg.mysql.database}`);
    this.pool = mysql.createPool({
      host: cfg.mysql.host,
      port: cfg.mysql.port,
      database: cfg.mysql.database,
      user: cfg.mysql.user,
      password: cfg.mysql.password,
      connectionLimit: 10,
      charset: 'utf8mb4',
    });

    try {
      await this.pool.query('SELECT 1');
      this.logger.log('MySQL connected successfully');
    } catch (error) {
      this.pool = undefined;
      throw error;
    }
  }

  async reset() {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('MySQL pool not initialized. Call ensureConnected() first.');
    }
    return this.pool;
  }

  /**
   * 获取连接池，如果未连接则自动连接
   */
  async getPoolAsync(): Promise<Pool> {
    await this.ensureConnected();
    return this.pool!;
  }
}

