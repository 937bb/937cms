import { Controller, UseGuards, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PublicThemeService } from './public-theme.service';
import { SessionTokenGuard } from '../session/session-token.guard';

@ApiTags('public')
@UseGuards(SessionTokenGuard)
@Controller('api/v1/theme')
export class PublicThemeController {
  constructor(private themeService: PublicThemeService) {}

  @Get()
  @ApiOperation({ summary: '获取主题配置' })
  @ApiQuery({ name: 'name', required: true, description: '主题名称' })
  @ApiResponse({ status: 200, description: '返回主题配置' })
  async getConfig(@Query('name') name: string) {
    return this.themeService.getConfig(name);
  }
}
