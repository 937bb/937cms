import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { CollectModule } from '../collect/collect.module';
import { ReceiveVodController } from './vod/receive-vod.controller';
import { ReceiveVodService } from './vod/receive-vod.service';
import { ReceiveArticleController } from './article/receive-article.controller';
import { ReceiveArticleService } from './article/receive-article.service';
import { SystemSettingsService } from '../admin/system/system-settings.service';
import { RedisCacheService } from '../../cache/redis-cache.service';
import { RedisCacheConfigService } from '../../cache/redis-cache-config.service';
import { VodQueryCacheService } from '../../cache/vod-query-cache.service';

@Module({
  imports: [ConfigModule, CollectModule],
  controllers: [ReceiveVodController, ReceiveArticleController],
  providers: [RedisCacheService, RedisCacheConfigService, VodQueryCacheService, ReceiveVodService, ReceiveArticleService, SystemSettingsService],
})
export class ReceiveModule {}
