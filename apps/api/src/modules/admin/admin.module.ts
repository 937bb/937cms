import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '../../config/config.module';
import { RuntimeConfigService } from '../../config/runtime-config.service';
import { CollectModule } from '../collect/collect.module';
import { PublicModule } from '../public/public.module';
import { SharedModule } from '../../shared/shared.module';
import { RedisCacheService } from '../../cache/redis-cache.service';
import { RedisCacheConfigService } from '../../cache/redis-cache-config.service';
import { VodQueryCacheService } from '../../cache/vod-query-cache.service';
import { AdminAuthController, AdminManageController } from './auth/admin-auth.controller';
import { AdminAuthService } from './auth/admin-auth.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { ThemeSettingsController } from './theme/theme-settings.controller';
import { ThemeSettingsService } from './theme/theme-settings.service';
import { SystemSettingsController } from './system/system-settings.controller';
import { SystemSettingsService } from './system/system-settings.service';
import { AdminPlayerController } from './player/admin-player.controller';
import { AdminPlayerService } from './player/admin-player.service';
import { AdminMemberController } from './member/admin-member.controller';
import { AdminMemberService } from './member/admin-member.service';
import { AdminCollectController } from './collect/admin-collect.controller';
import { AdminCollectSettingsController } from './collect/admin-collect-settings.controller';
import { AdminCollectTypeBindController } from './collect/admin-collect-type-bind.controller';
import { AdminTypeController } from './type/admin-type.controller';
import { AdminTypeService } from './type/admin-type.service';
import { AdminVodController } from './vod/admin-vod.controller';
import { AdminVodService } from './vod/admin-vod.service';
import { AdminLinksController } from './links/admin-links.controller';
import { AdminLinksService } from './links/admin-links.service';
import { AdminThemeController } from './theme/admin-theme.controller';
import { AdminThemeService } from './theme/admin-theme.service';
import { AdminArticlesController } from './articles/admin-articles.controller';
import { AdminArticlesService } from './articles/admin-articles.service';
import { AdminGbookController } from './gbook/admin-gbook.controller';
import { AdminGbookService } from './gbook/admin-gbook.service';
import { AdminCommentsController } from './comments/admin-comments.controller';
import { AdminCommentsService } from './comments/admin-comments.service';
import { AdminUploadController } from './upload/admin-upload.controller';
import { AdminTopicController } from './topic/admin-topic.controller';
import { AdminTopicService } from './topic/admin-topic.service';
import { AdminActorController } from './actor/admin-actor.controller';
import { AdminActorService } from './actor/admin-actor.service';
import { AdminRoleController } from './role/admin-role.controller';
import { AdminRoleService } from './role/admin-role.service';
import { AdminServerGroupController } from './server-group/admin-server-group.controller';
import { AdminServerGroupService } from './server-group/admin-server-group.service';
import { AdminDownloaderController } from './downloader/admin-downloader.controller';
import { AdminDownloaderService } from './downloader/admin-downloader.service';
import { AdminAttachmentController } from './attachment/admin-attachment.controller';
import { AdminAttachmentService } from './attachment/admin-attachment.service';
import { AdminDatabaseController } from './database/admin-database.controller';
import { AdminDatabaseService } from './database/admin-database.service';
import { EpisodeService } from './vod/episode.service';
import { PosterSearchController } from './poster/poster-search.controller';
import { PosterSearchService } from './poster/poster-search.service';
import { ApiKeyController } from './system/api-key.controller';
import { ApiKeyService } from './system/api-key.service';
import { SessionTokenConfigController } from './system/session-token-config.controller';
import { SessionTokenConfigService } from './system/session-token-config.service';
import { RedisCacheConfigController } from './system/redis-cache-config.controller';
import { AdminDashboardModule } from './dashboard/admin-dashboard.module';
import { ThemeManagementModule } from './theme/theme-management.module';

@Module({
  imports: [
    ConfigModule,
    CollectModule,
    PublicModule,
    SharedModule,
    AdminDashboardModule,
    ThemeManagementModule,
    PassportModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [RuntimeConfigService],
      useFactory: (cfg: RuntimeConfigService) => ({
        secret: cfg.require().security.adminJwtSecret,
        signOptions: { expiresIn: '7d' as any },
      }),
    }),
  ],
  controllers: [
    AdminAuthController,
    AdminManageController,
    ThemeSettingsController,
    SystemSettingsController,
    AdminPlayerController,
    AdminMemberController,
    AdminCollectController,
    AdminCollectSettingsController,
    AdminCollectTypeBindController,
    AdminTypeController,
    AdminVodController,
    AdminLinksController,
    AdminThemeController,
    AdminArticlesController,
    AdminGbookController,
    AdminCommentsController,
    AdminUploadController,
    AdminTopicController,
    AdminActorController,
    AdminRoleController,
    AdminServerGroupController,
    AdminDownloaderController,
    AdminAttachmentController,
    AdminDatabaseController,
    PosterSearchController,
    ApiKeyController,
    SessionTokenConfigController,
    RedisCacheConfigController,
  ],
  providers: [
    RedisCacheService,
    RedisCacheConfigService,
    VodQueryCacheService,
    AdminAuthService,
    ThemeSettingsService,
    SystemSettingsService,
    AdminPlayerService,
    AdminMemberService,
    AdminTypeService,
    AdminVodService,
    AdminLinksService,
    AdminThemeService,
    AdminArticlesService,
    AdminGbookService,
    AdminCommentsService,
    AdminTopicService,
    AdminActorService,
    AdminRoleService,
    AdminServerGroupService,
    AdminDownloaderService,
    AdminAttachmentService,
    AdminDatabaseService,
    EpisodeService,
    PosterSearchService,
    ApiKeyService,
    SessionTokenConfigService,
    JwtStrategy,
  ],
})
export class AdminModule {}
