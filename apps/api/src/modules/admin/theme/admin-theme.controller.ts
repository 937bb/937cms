import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminThemeService } from './admin-theme.service';

@Controller('admin/theme')
@UseGuards(AuthGuard('jwt'))
export class AdminThemeController {
  constructor(private themeService: AdminThemeService) {}

  @Get('list')
  async list() {
    return this.themeService.list();
  }

  @Get('config')
  async getConfig(@Query('name') name: string) {
    return this.themeService.getConfig(name);
  }

  @Post('config')
  async saveConfig(
    @Query('name') name: string,
    @Body() config: Record<string, any>,
  ) {
    return this.themeService.saveConfig(name, config);
  }

  @Post('status')
  async updateStatus(@Body() body: { name: string; status: number }) {
    return this.themeService.updateStatus(body.name, body.status);
  }
}
