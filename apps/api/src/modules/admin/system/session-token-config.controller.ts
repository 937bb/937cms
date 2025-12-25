import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SessionTokenConfigService } from './session-token-config.service';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('admin/system')
@Controller('admin/session-token-config')
@UseGuards(AdminGuard)
export class SessionTokenConfigController {
  constructor(private readonly svc: SessionTokenConfigService) {}

  @Get()
  async getConfig() {
    const data = await this.svc.getConfig();
    return { ok: true, data };
  }

  @Post()
  async updateConfig(@Body() body: { enabled: number; ttl: number }) {
    const data = await this.svc.updateConfig(body);
    return { ok: true, data };
  }
}
