import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { MySQLService } from '../db/mysql.service';
import type { RowDataPacket } from 'mysql2/promise';

@Injectable()
export class RedisCacheService {
  private redis: Redis | null = null;
  private readonly logger = new Logger(RedisCacheService.name);
  private enabled = false;

  constructor(private readonly db: MySQLService) {}

  async onModuleInit() {
    try {
      const cfg = await this.getRedisConfig();
      if (!cfg?.enabled) {
        this.logger.warn('Redis not configured, cache disabled');
        return;
      }

      this.redis = new Redis({
        host: cfg.host || '127.0.0.1',
        port: cfg.port || 6379,
        password: cfg.password || undefined,
        db: cfg.db || 0,
        retryStrategy: (times) => Math.min(times * 50, 2000),
        enableReadyCheck: false,
        enableOfflineQueue: false,
      });

      this.redis.on('error', (err) => {
        this.logger.error('Redis connection error:', err);
        this.redis = null;
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected');
        this.enabled = true;
      });

      await this.redis.ping();
      this.enabled = true;
    } catch (error) {
      this.logger.warn('Redis initialization failed, cache disabled:', error);
      this.redis = null;
    }
  }

  private async getRedisConfig(): Promise<any> {
    try {
      const pool = this.db.getPool();
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT value_json FROM bb_setting WHERE `key` = 'redis' LIMIT 1"
      );
      const row = rows?.[0];
      if (!row?.value_json) return null;
      return JSON.parse(String(row.value_json || '{}'));
    } catch {
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redis) return null;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.enabled || !this.redis) return false;
    try {
      const data = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, data);
      } else {
        await this.redis.set(key, data);
      }
      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.enabled || !this.redis) return false;
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Cache del error for key ${key}:`, error);
      return false;
    }
  }

  async delPattern(pattern: string): Promise<number> {
    if (!this.enabled || !this.redis) return 0;
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.redis.del(...keys);
    } catch (error) {
      this.logger.error(`Cache delPattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
