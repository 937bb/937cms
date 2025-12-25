import { Controller, UseGuards, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicProvideService } from './public-provide.service';
import { SessionTokenGuard } from '../session/session-token.guard';

@ApiTags('public')
@UseGuards(SessionTokenGuard)
@Controller('api/v1/provide')
export class PublicProvideController {
  constructor(private readonly svc: PublicProvideService) {}

  @Get('vod')
  @ApiOperation({ summary: '获取视频数据' })
  @ApiResponse({ status: 200, description: '返回视频数据' })
  async vod(@Query() query: Record<string, unknown>) {
    return this.svc.vod(query);
  }

  @Get('art')
  @ApiOperation({ summary: '获取文章数据' })
  @ApiResponse({ status: 200, description: '返回文章数据' })
  async art(@Query() query: Record<string, unknown>) {
    return this.svc.art(query);
  }
}
