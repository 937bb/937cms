import { Controller, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicConfigService } from './public-config.service';
import { SessionTokenGuard } from '../session/session-token.guard';

@ApiTags('public/config')
@UseGuards(SessionTokenGuard)
@Controller('api/v1/config')
export class PublicConfigController {
  constructor(private readonly svc: PublicConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取站点配置' })
  @ApiResponse({ status: 200, description: '返回站点配置信息' })
  async getConfig() {
    return this.svc.getSiteConfig();
  }

  @Get('links')
  @ApiOperation({ summary: '获取友情链接' })
  @ApiResponse({ status: 200, description: '返回友情链接列表' })
  async getLinks() {
    return this.svc.getLinks();
  }

  @Get('extend')
  @ApiOperation({ summary: '获取扩展配置' })
  @ApiResponse({ status: 200, description: '返回扩展配置信息' })
  async getExtend() {
    return this.svc.getExtend();
  }
}
