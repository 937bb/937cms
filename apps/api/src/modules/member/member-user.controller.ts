import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberGuard } from './member.guard';
import { MemberUserService } from './member-user.service';

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(MemberGuard)
@Controller('api/v1/user')
export class MemberUserController {
  constructor(private readonly svc: MemberUserService) {}

  @Get('info')
  @ApiOperation({ summary: '获取用户信息' })
  async getInfo(@Req() req: any) {
    return this.svc.getInfo(req.user.sub);
  }

  @Post('info')
  @ApiOperation({ summary: '更新用户信息' })
  async updateInfo(@Req() req: any, @Body() body: { nickname?: string; email?: string; avatar?: string }) {
    return this.svc.updateInfo(req.user.sub, body);
  }

  @Post('password')
  @ApiOperation({ summary: '修改密码' })
  async changePassword(@Req() req: any, @Body() body: { oldPassword: string; newPassword: string }) {
    if (!body.oldPassword || !body.newPassword) {
      throw new BadRequestException('请填写完整');
    }
    if (body.newPassword.length < 6) {
      throw new BadRequestException('新密码至少6个字符');
    }
    try {
      return await this.svc.changePassword(req.user.sub, body.oldPassword, body.newPassword);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  // 收藏 - 兼容 favs 和 favorites 两种路径
  @Get('favs')
  @ApiOperation({ summary: '获取收藏列表' })
  async getFavs(@Req() req: any, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const result = await this.svc.getFavorites(req.user.sub, Number(page || 1), Number(pageSize || 20));
    // 转换字段名以匹配前端期望
    return {
      list: result.items.map((item: any) => ({
        id: item.id,
        rid: item.vod_id,
        vodName: item.vod_name,
        vodPic: item.vod_pic,
        vodRemarks: item.vod_remarks,
        typeName: item.type_name,
        createdAt: item.created_at,
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Post('favs/add')
  @ApiOperation({ summary: '添加收藏' })
  async addFav(@Req() req: any, @Body() body: { rid: number }) {
    return this.svc.addFavorite(req.user.sub, body.rid);
  }

  @Post('favs/delete')
  @ApiOperation({ summary: '删除收藏' })
  async deleteFavs(@Req() req: any, @Body() body: { ids: number[] }) {
    for (const id of body.ids || []) {
      await this.svc.removeFavoriteById(req.user.sub, id);
    }
    return { ok: true };
  }

  @Post('favs/clear')
  @ApiOperation({ summary: '清空收藏' })
  async clearFavs(@Req() req: any) {
    return this.svc.clearFavorites(req.user.sub);
  }

  @Get('favs/check/:rid')
  @ApiOperation({ summary: '检查是否已收藏' })
  async checkFav(@Req() req: any, @Param('rid') rid: string) {
    return this.svc.isFavorite(req.user.sub, Number(rid));
  }

  // 播放历史 - 兼容 plays 和 history 两种路径
  @Get('plays')
  @ApiOperation({ summary: '获取播放历史' })
  async getPlays(@Req() req: any, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const result = await this.svc.getPlayHistory(req.user.sub, Number(page || 1), Number(pageSize || 20));
    return {
      list: result.items.map((item: any) => ({
        id: item.id,
        rid: item.vod_id,
        vodName: item.vod_name,
        vodPic: item.vod_pic,
        vodRemarks: item.vod_remarks,
        typeName: item.type_name,
        episodeIndex: item.episode_index,
        playTime: item.play_time,
        updatedAt: item.updated_at,
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Post('plays/add')
  @ApiOperation({ summary: '记录播放历史' })
  async addPlay(@Req() req: any, @Body() body: { rid: number; episodeIndex?: number; playTime?: number }) {
    return this.svc.recordPlayHistory(req.user.sub, body.rid, body.episodeIndex || 0, body.playTime || 0);
  }

  @Post('plays/delete')
  @ApiOperation({ summary: '删除播放历史' })
  async deletePlays(@Req() req: any, @Body() body: { ids: number[] }) {
    for (const id of body.ids || []) {
      await this.svc.removePlayHistoryById(req.user.sub, id);
    }
    return { ok: true };
  }

  @Post('plays/clear')
  @ApiOperation({ summary: '清空播放历史' })
  async clearPlays(@Req() req: any) {
    return this.svc.clearPlayHistory(req.user.sub);
  }
}
