import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { CollectSettingsService, type CollectSettings } from '../../collect/settings/collect-settings.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/collect/settings')
export class AdminCollectSettingsController {
  constructor(private readonly svc: CollectSettingsService) {}

  @Get()
  async get() {
    return this.svc.get();
  }

  @Post('save')
  async save(@Body() body: CollectSettings) {
    return this.svc.save(body || {});
  }
}

