import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { ThemeSettingsService } from './theme-settings.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/theme-settings')
export class ThemeSettingsController {
  constructor(private readonly svc: ThemeSettingsService) {}

  @Get(':themeId')
  async get(@Param('themeId') themeId: string) {
    return this.svc.get(themeId);
  }

  @Post(':themeId/save')
  async save(@Param('themeId') themeId: string, @Body() body: unknown) {
    return this.svc.save(themeId, body);
  }
}

