import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { RedisCacheService } from '../../../cache/redis-cache.service';
import { RedisCacheConfigService } from '../../../cache/redis-cache-config.service';

@Injectable()
export class PublicTypesService {
  constructor(
    private readonly db: MySQLService,
    private readonly cache: RedisCacheService,
    private readonly cacheConfig: RedisCacheConfigService,
  ) {}

  async list() {
    const cacheKey = 'cache:types:list';

    // Try to get from cache
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT type_id, type_name, type_en, type_pid, type_mid, type_sort, type_extend FROM bb_type WHERE type_status = 1 AND type_mid = 1 ORDER BY type_sort ASC, type_id ASC',
    );

    const result = rows.map((r) => {
      let extend: Record<string, string> = {};
      try {
        if (r.type_extend) extend = JSON.parse(r.type_extend);
      } catch {
        // 忽略
      }
      return {
        id: r.type_id,
        name: r.type_name,
        en: r.type_en,
        pid: r.type_pid,
        mid: r.type_mid,
        sort: r.type_sort,
        extend,
      };
    });

    // Cache with configurable TTL
    const ttl = await this.cacheConfig.getModuleTtl('types');
    await this.cache.set(cacheKey, result, ttl);
    return result;
  }

  async clearCache() {
    await this.cache.del('cache:types:list');
  }
}

