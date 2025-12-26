import { Module } from '@nestjs/common';
import { MemberAuthModule } from '../member/member-auth.module';
import { SharedModule } from '../../shared/shared.module';
import { RedisCacheService } from '../../cache/redis-cache.service';
import { RedisCacheConfigService } from '../../cache/redis-cache-config.service';
import { VodQueryCacheService } from '../../cache/vod-query-cache.service';
import { SearchCacheService } from '../../cache/search-cache.service';
import { SystemSettingsService } from '../admin/system/system-settings.service';
import { PublicTypesController } from './types/public-types.controller';
import { PublicTypesService } from './types/public-types.service';
import { PublicVodsController } from './vods/public-vods.controller';
import { PublicVodsService } from './vods/public-vods.service';
import { PublicPlayersController } from './players/public-players.controller';
import { PublicPlayersService } from './players/public-players.service';
import { PublicUserController } from './user/public-user.controller';
import { PublicUserService } from './user/public-user.service';
import { PublicGbookController } from './gbook/public-gbook.controller';
import { PublicGbookService } from './gbook/public-gbook.service';
import { PublicConfigController } from './config/public-config.controller';
import { PublicConfigService } from './config/public-config.service';
import { PublicCommentsController } from './comments/public-comments.controller';
import { PublicCommentsService } from './comments/public-comments.service';
import { PublicThemeController } from './theme/public-theme.controller';
import { PublicThemeService } from './theme/public-theme.service';
import { PublicArticlesController } from './articles/public-articles.controller';
import { PublicArticlesService } from './articles/public-articles.service';
import { PublicVerifyController } from './verify/public-verify.controller';
import { PublicVerifyService } from './verify/public-verify.service';
import { PublicProvideController } from './provide/public-provide.controller';
import { PublicProvideService } from './provide/public-provide.service';
import { PublicMemberGroupService } from './member-group/public-member-group.service';
import { SessionTokenController } from './session/session-token.controller';
import { SessionTokenService } from './session/session-token.service';
import { SessionTokenGuard } from './session/session-token.guard';
import { ThemeManagementModule } from '../admin/theme/theme-management.module';

@Module({
  imports: [MemberAuthModule, SharedModule, ThemeManagementModule],
  controllers: [
    PublicTypesController,
    PublicVodsController,
    PublicPlayersController,
    PublicUserController,
    PublicGbookController,
    PublicConfigController,
    PublicCommentsController,
    PublicThemeController,
    PublicArticlesController,
    PublicVerifyController,
    PublicProvideController,
    SessionTokenController,
  ],
  providers: [
    RedisCacheService,
    RedisCacheConfigService,
    VodQueryCacheService,
    SearchCacheService,
    SystemSettingsService,
    PublicTypesService,
    PublicVodsService,
    PublicPlayersService,
    PublicUserService,
    PublicGbookService,
    PublicConfigService,
    PublicCommentsService,
    PublicThemeService,
    PublicArticlesService,
    PublicVerifyService,
    PublicProvideService,
    PublicMemberGroupService,
    SessionTokenService,
    SessionTokenGuard,
  ],
  exports: [PublicVerifyService, PublicMemberGroupService],
})
export class PublicModule {}
