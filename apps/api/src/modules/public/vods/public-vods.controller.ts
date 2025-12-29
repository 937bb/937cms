import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MemberOptionalGuard } from '../../member/member-optional.guard';
import { SessionTokenGuard } from '../session/session-token.guard';
import { PublicVodsService } from './public-vods.service';

@ApiTags('public')
@UseGuards(SessionTokenGuard)
@Controller('api/v1/vods')
export class PublicVodsController {
  constructor(private readonly svc: PublicVodsService) {}

  @Get()
  @UseGuards(MemberOptionalGuard)
  @ApiOperation({ summary: '获取视频列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认1' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量，默认20' })
  @ApiQuery({ name: 'typeId', required: false, description: '分类ID' })
  @ApiQuery({ name: 'keyword', required: false, description: '搜索关键词' })
  @ApiResponse({ status: 200, description: '返回视频列表' })
  async list(@Query() query: Record<string, unknown>, @Req() req: any) {
    const groupId = req.user?.groupId || 1;
    return this.svc.list(query, groupId);
  }

  @Get(':id')
  @UseGuards(MemberOptionalGuard)
  @ApiOperation({ summary: '获取视频详情' })
  @ApiParam({ name: 'id', description: '视频ID' })
  @ApiResponse({ status: 200, description: '返回视频详情' })
  async detail(@Param('id') id: string, @Req() req: any) {
    const numeric = Number(id);
    if (!Number.isFinite(numeric)) return null;
    const groupId = req.user?.groupId || 1;
    return this.svc.detail(Math.floor(numeric), groupId);
  }

  @Post(':id/hit')
  @ApiOperation({ summary: '记录视频播放' })
  @ApiParam({ name: 'id', description: '视频ID' })
  @ApiResponse({ status: 200, description: '播放记录已保存' })
  async hit(@Param('id') id: string) {
    const numeric = Number(id);
    if (!Number.isFinite(numeric)) return { ok: false };
    return this.svc.hit(Math.floor(numeric));
  }
}
