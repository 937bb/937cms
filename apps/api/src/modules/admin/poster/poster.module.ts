import { Module } from '@nestjs/common';
import { ConfigModule } from '../../../config/config.module';
import { PosterSearchService } from './poster-search.service';
import { PosterSearchController } from './poster-search.controller';
import { SystemSettingsService } from '../system/system-settings.service';

@Module({
  imports: [ConfigModule],
  controllers: [PosterSearchController],
  providers: [PosterSearchService, SystemSettingsService],
  exports: [PosterSearchService],
})
export class PosterModule {}
