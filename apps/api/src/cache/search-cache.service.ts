import { Injectable } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';
import { RedisCacheConfigService } from './redis-cache-config.service';
import { MySQLService } from '../db/mysql.service';

@Injectable()
export class SearchCacheService {
  constructor(
    private readonly cache: RedisCacheService,
    private readonly db: MySQLService,
    private readonly cacheConfig: RedisCacheConfigService,
  ) {}

  /**
   * 生成搜索缓存 key
   */
  private getCacheKey(params: Record<string, any>): string {
    const parts = [
      params.keyword || '',
      params.typeId || '',
      params.typeId1 || '',
      params.year || '',
      params.area || '',
      params.lang || '',
      params.class || '',
      params.letter || '',
      params.level || '',
      params.page || 1,
      params.pageSize || 24,
      params.sort || 'time',
      params.order || 'desc',
      params.groupId || 1,
    ];
    return `search:${parts.join(':')}`;
  }

  /**
   * 获取搜索结果（带缓存）
   */
  async searchVods(
    query: Record<string, any>,
    groupId: number,
    executor: () => Promise<any>,
  ): Promise<any> {
    const cacheKey = this.getCacheKey({ ...query, groupId });

    // 尝试从缓存获取
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    // 执行搜索
    const result = await executor();

    // 缓存结果
    const ttl = await this.cacheConfig.getModuleTtl('search');
    await this.cache.set(cacheKey, result, ttl);

    return result;
  }

  /**
   * 清除所有搜索缓存
   */
  async invalidateAllSearchCache(): Promise<void> {
    await this.cache.delPattern('search:*');
  }

  /**
   * 清除特定关键词的搜索缓存
   */
  async invalidateSearchByKeyword(keyword: string): Promise<void> {
    await this.cache.delPattern(`search:${keyword}:*`);
  }
}
