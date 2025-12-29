import { Injectable } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';
import { RedisCacheConfigService } from './redis-cache-config.service';
import { MySQLService } from '../db/mysql.service';

@Injectable()
export class VodQueryCacheService {
  constructor(
    private readonly cache: RedisCacheService,
    private readonly db: MySQLService,
    private readonly cacheConfig: RedisCacheConfigService,
  ) {}

  /**
   * 获取视频集数列表（带缓存）
   */
  async getVodEpisodes(vodId: number, sourceId?: number) {
    const cacheKey = sourceId ? `vod:episodes:${vodId}:${sourceId}` : `vod:episodes:${vodId}`;

    // 尝试从缓存获取
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    // 从数据库查询
    const pool = this.db.getPool();
    let query = 'SELECT id, vod_id, source_id, episode_num, title, url, sort FROM bb_vod_episode WHERE vod_id = ?';
    const params: any[] = [vodId];

    if (sourceId) {
      query += ' AND source_id = ?';
      params.push(sourceId);
    }

    query += ' ORDER BY sort ASC';

    const [rows] = await pool.query<any[]>(query, params);

    // 缓存结果
    const ttl = await this.cacheConfig.getModuleTtl('vodQuery');
    await this.cache.set(cacheKey, rows, ttl);

    return rows || [];
  }

  /**
   * 获取源的集数列表（带缓存）
   */
  async getSourceEpisodes(sourceId: number, limit = 100) {
    const cacheKey = `source:episodes:${sourceId}:${limit}`;

    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id, vod_id, source_id, episode_num, title, sort FROM bb_vod_episode WHERE source_id = ? ORDER BY sort ASC LIMIT ?',
      [sourceId, limit],
    );

    const ttl = await this.cacheConfig.getModuleTtl('vodQuery');
    await this.cache.set(cacheKey, rows, ttl);
    return rows || [];
  }

  /**
   * 获取视频源列表（带缓存）
   */
  async getVodSources(vodId: number) {
    const cacheKey = `vod:sources:${vodId}`;

    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id, vod_id, player_id, player_name, sort FROM bb_vod_source WHERE vod_id = ? ORDER BY sort ASC',
      [vodId],
    );

    const ttl = await this.cacheConfig.getModuleTtl('vodQuery');
    await this.cache.set(cacheKey, rows, ttl);
    return rows || [];
  }

  /**
   * 清除视频相关缓存
   */
  async invalidateVodCache(vodId: number) {
    await this.cache.delPattern(`vod:episodes:${vodId}:*`);
    await this.cache.delPattern(`vod:sources:${vodId}`);
  }

  /**
   * 清除源相关缓存
   */
  async invalidateSourceCache(sourceId: number) {
    await this.cache.delPattern(`source:episodes:${sourceId}:*`);
  }

  /**
   * 获取视频源和集数（JOIN查询，用于公开API）
   */
  async getVodSourcesWithEpisodes(vodId: number) {
    const cacheKey = `vod:sources:episodes:${vodId}`;

    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      `SELECT s.id as source_id, s.player_name, s.sort as source_sort,
              e.title, e.url, e.sort as ep_sort, e.id as ep_id
       FROM bb_vod_source s
       LEFT JOIN bb_vod_episode e ON e.source_id = s.id
       WHERE s.vod_id = ?
       ORDER BY s.sort ASC, s.id ASC, e.sort ASC, e.id ASC`,
      [vodId],
    );

    const ttl = await this.cacheConfig.getModuleTtl('vodQuery');
    await this.cache.set(cacheKey, rows, ttl);
    return rows || [];
  }

  /**
   * 清除所有视频缓存
   */
  async invalidateAllVodCache() {
    await this.cache.delPattern('vod:*');
    await this.cache.delPattern('source:*');
  }
}
