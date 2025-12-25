import { Injectable } from '@nestjs/common';
import { SystemSettingsService, RedisSettings, RedisCacheModuleConfig } from '../modules/admin/system/system-settings.service';

type ModuleName = 'vodQuery' | 'search' | 'theme' | 'config' | 'types';

@Injectable()
export class RedisCacheConfigService {
  constructor(private readonly systemSettings: SystemSettingsService) {}

  async getRedisSettings(): Promise<RedisSettings> {
    return this.systemSettings.getRedis();
  }

  async isRedisEnabled(): Promise<boolean> {
    const settings = await this.getRedisSettings();
    return settings.enabled === 1;
  }

  async getModuleConfig(moduleName: ModuleName): Promise<RedisCacheModuleConfig> {
    const settings = await this.getRedisSettings();
    const moduleConfig = settings.modules?.[moduleName];

    // 默认配置
    const defaults: Record<ModuleName, RedisCacheModuleConfig> = {
      vodQuery: { enabled: 1, ttl: 3600 },
      search: { enabled: 1, ttl: 600 },
      theme: { enabled: 1, ttl: 3600 },
      config: { enabled: 1, ttl: 3600 },
      types: { enabled: 1, ttl: 3600 },
    };

    return {
      enabled: moduleConfig?.enabled ?? defaults[moduleName].enabled,
      ttl: moduleConfig?.ttl ?? defaults[moduleName].ttl,
    };
  }

  async isModuleEnabled(moduleName: ModuleName): Promise<boolean> {
    const redisEnabled = await this.isRedisEnabled();
    if (!redisEnabled) return false;

    const moduleConfig = await this.getModuleConfig(moduleName);
    return moduleConfig.enabled === 1;
  }

  async getModuleTtl(moduleName: ModuleName): Promise<number> {
    const moduleConfig = await this.getModuleConfig(moduleName);
    return moduleConfig.ttl || 3600;
  }
}
