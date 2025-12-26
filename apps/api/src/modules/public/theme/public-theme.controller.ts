import { Controller, Get, Query } from '@nestjs/common';
import { ThemeManagementService } from '../../admin/theme/theme-management.service';
import { PublicThemeService } from './public-theme.service';

@Controller('api/theme')
export class PublicThemeController {
  constructor(
    private readonly themeManagementService: ThemeManagementService,
    private readonly publicThemeService: PublicThemeService,
  ) {}

  @Get('active')
  async getActiveTheme() {
    return this.themeManagementService.getActiveThemeConfig();
  }

  @Get('config')
  async getThemeConfig(@Query('name') themeName: string = 'default') {
    return this.publicThemeService.getConfig(themeName);
  }
}
