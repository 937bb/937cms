import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { CollectService } from './collect.service';
import { CollectTaskService } from './collect-task.service';
import { CollectorQueueController } from './collector-queue.controller';
import { CollectorGuard } from './collector.guard';
import { CollectSchedulerService } from './collect.scheduler';
import { GoCollectorRunnerService } from './runner/go-collector-runner.service';
import { CollectSettingsService } from './settings/collect-settings.service';
import { CollectTypeBindService } from './type-bind/collect-type-bind.service';
import { CollectSearchService } from './collect-search.service';
import { ReceiveVodService } from '../receive/vod/receive-vod.service';
import { SystemSettingsService } from '../admin/system/system-settings.service';
import { RedisCacheService } from '../../cache/redis-cache.service';
import { RedisCacheConfigService } from '../../cache/redis-cache-config.service';
import { VodQueryCacheService } from '../../cache/vod-query-cache.service';
import { CronSchedulerService } from './cron/cron-scheduler.service';

@Module({
  imports: [ConfigModule],
  controllers: [CollectorQueueController],
  providers: [
    RedisCacheService,
    RedisCacheConfigService,
    VodQueryCacheService,
    CollectService,
    CollectTaskService,
    CollectSettingsService,
    CollectorGuard,
    GoCollectorRunnerService,
    CollectSchedulerService,
    CollectTypeBindService,
    CollectSearchService,
    ReceiveVodService,
    SystemSettingsService,
    CronSchedulerService,
  ],
  exports: [CollectService, CollectTaskService, CollectSettingsService, GoCollectorRunnerService, CollectTypeBindService, CollectSearchService],
})
export class CollectModule {}
