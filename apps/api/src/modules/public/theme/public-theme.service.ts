import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { RedisCacheService } from '../../../cache/redis-cache.service';
import { RedisCacheConfigService } from '../../../cache/redis-cache-config.service';
import type { RowDataPacket } from 'mysql2/promise';

@Injectable()
export class PublicThemeService {
  constructor(
    private readonly db: MySQLService,
    private readonly cache: RedisCacheService,
    private readonly cacheConfig: RedisCacheConfigService,
  ) {}

  async getConfig(themeName: string) {
    const cacheKey = `cache:theme:${themeName}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const pool = this.db.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT config FROM bb_theme_config WHERE theme_name = ? AND status = 1',
      [themeName],
    );
    let result = {};
    if (rows.length) {
      try {
        result = typeof rows[0].config === 'string'
          ? JSON.parse(rows[0].config)
          : rows[0].config || {};
      } catch {
        result = {};
      }
    }
    const ttl = await this.cacheConfig.getModuleTtl('theme');
    await this.cache.set(cacheKey, result, ttl);
    return result;
  }
}
