import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ThemeManagementService } from './theme-management.service';

@Controller('admin/theme')
@UseGuards(AdminGuard)
export class ThemeManagementController {
  constructor(private readonly themeService: ThemeManagementService) {}

  @Get()
  async list() {
    return this.themeService.listThemes();
  }

  @Get(':themeId')
  async detail(@Param('themeId') themeId: string) {
    return this.themeService.getTheme(themeId);
  }

  @Post()
  async install(@Body() input: {
    themeId: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    homepage?: string;
    repository?: string;
    configSchema: Record<string, any>;
  }) {
    return this.themeService.installTheme(input);
  }

  @Put(':themeId/config')
  async updateConfig(
    @Param('themeId') themeId: string,
    @Body() input: { config: Record<string, any> },
  ) {
    return this.themeService.updateThemeConfig(themeId, input.config);
  }

  @Post(':themeId/activate')
  async activate(@Param('themeId') themeId: string) {
    return this.themeService.activateTheme(themeId);
  }

  @Delete(':themeId')
  async delete(@Param('themeId') themeId: string) {
    return this.themeService.deleteTheme(themeId);
  }
}
