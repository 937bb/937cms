import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SystemSettingsService } from './system-settings.service';
import type { RedisSettings } from './system-settings.service';

@Controller('admin/system/redis-cache')
@UseGuards(AdminGuard)
export class RedisCacheConfigController {
  constructor(private readonly systemSettings: SystemSettingsService) {}

  @Get('config')
  async getConfig(): Promise<RedisSettings> {
    return this.systemSettings.getRedis();
  }

  @Post('config')
  async updateConfig(@Body() partial: RedisSettings) {
    return this.systemSettings.saveRedis(partial);
  }

  @Post('clear')
  async clearCache() {
    return this.systemSettings.clearRedisCache();
  }

  @Post('test')
  async testConnection(
    @Body() data: { host: string; port: number; password: string; db: number },
  ) {
    return this.systemSettings.testRedisConnection(data.host, data.port, data.password, data.db);
  }
}
