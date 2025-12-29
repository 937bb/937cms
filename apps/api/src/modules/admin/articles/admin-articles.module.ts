import { Module } from '@nestjs/common';
import { AdminArticlesController } from './admin-articles.controller';
import { AdminArticlesService } from './admin-articles.service';

@Module({
  controllers: [AdminArticlesController],
  providers: [AdminArticlesService],
})
export class AdminArticlesModule {}
