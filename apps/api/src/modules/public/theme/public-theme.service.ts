import { Injectable } from '@nestjs/common';
import { RedisCacheService } from '../../../cache/redis-cache.service';
import { RedisCacheConfigService } from '../../../cache/redis-cache-config.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PublicThemeService {
  constructor(
    private readonly cache: RedisCacheService,
    private readonly cacheConfig: RedisCacheConfigService,
  ) {}

  async getConfig(themeName: string) {
    const cacheKey = `cache:theme:${themeName}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const projectRoot = path.join(__dirname, '../../../../..');
    const configPath = path.join(projectRoot, 'data/themes', themeName, 'config.json');

    let result = {};
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        result = JSON.parse(content);
      } catch {
        result = {};
      }
    }

    const ttl = await this.cacheConfig.getModuleTtl('theme');
    await this.cache.set(cacheKey, result, ttl);
    return result;
  }
}
