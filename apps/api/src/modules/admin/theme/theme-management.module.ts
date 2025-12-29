import { Module } from '@nestjs/common';
import { DbModule } from '../../../db/db.module';
import { ThemeManagementService } from './theme-management.service';
import { ThemeManagementController } from './theme-management.controller';

@Module({
  imports: [DbModule],
  providers: [ThemeManagementService],
  controllers: [ThemeManagementController],
  exports: [ThemeManagementService],
})
export class ThemeManagementModule {}
