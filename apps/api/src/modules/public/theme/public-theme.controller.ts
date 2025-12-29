import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ThemeManagementService } from '../../admin/theme/theme-management.service';
import { PublicThemeService } from './public-theme.service';
import { SessionTokenGuard } from '../session/session-token.guard';

@UseGuards(SessionTokenGuard)
@Controller('api/v1')
export class PublicThemeController {
  constructor(
    private readonly themeManagementService: ThemeManagementService,
    private readonly publicThemeService: PublicThemeService,
  ) {}

  @Get('theme')
  async getThemeConfig(@Query('name') themeName: string = 'mxpro') {
    return this.publicThemeService.getConfig(themeName);
  }
}
