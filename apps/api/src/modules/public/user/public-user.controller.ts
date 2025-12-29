import { Body, Controller, Get, Headers, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { PublicUserService } from './public-user.service';
import type { Request } from 'express';
import { SessionTokenGuard } from '../session/session-token.guard';

function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0].trim();
  if (Array.isArray(xff)) return xff[0];
  return req.ip || req.socket?.remoteAddress || '';
}

function getToken(auth: string | undefined): string {
  if (!auth) return '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return auth;
}

@ApiTags('public/user')
@UseGuards(SessionTokenGuard)
@Controller('api/v1/user')
export class PublicUserController {
  constructor(private readonly svc: PublicUserService) {}

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiBody({ schema: { properties: { username: { type: 'string', description: '用户名' }, password: { type: 'string', description: '密码' }, email: { type: 'string', description: '邮箱' } } } })
  @ApiResponse({ status: 200, description: '注册成功' })
  async register(@Body() body: any, @Req() req: Request) {
    return this.svc.register(body, getClientIp(req));
  }

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ schema: { properties: { username: { type: 'string', description: '用户名' }, password: { type: 'string', description: '密码' } } } })
  @ApiResponse({ status: 200, description: '登录成功，返回token' })
  async login(@Body() body: any, @Req() req: Request) {
    return this.svc.login(body, getClientIp(req));
  }

  @Post('logout')
  @ApiOperation({ summary: '用户登出' })
  @ApiResponse({ status: 200, description: '登出成功' })
  async logout(@Headers('authorization') auth: string) {
    return this.svc.logout(getToken(auth));
  }

  @Get('info')
  @ApiOperation({ summary: '获取用户信息' })
  @ApiResponse({ status: 200, description: '返回用户信息' })
  async getInfo(@Headers('authorization') auth: string) {
    const user = await this.svc.validateToken(getToken(auth));
    return this.svc.getInfo(user.id);
  }

  @Post('info')
  @ApiOperation({ summary: '更新用户信息' })
  @ApiBody({ schema: { properties: { nickname: { type: 'string', description: '昵称' }, avatar: { type: 'string', description: '头像' } } } })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateInfo(@Headers('authorization') auth: string, @Body() body: any) {
    const user = await this.svc.validateToken(getToken(auth));
    await this.svc.updateInfo(user.id, body);
    return this.svc.getInfo(user.id);
  }

  @Post('password')
  @ApiOperation({ summary: '修改密码' })
  @ApiBody({ schema: { properties: { oldPassword: { type: 'string', description: '旧密码' }, newPassword: { type: 'string', description: '新密码' } } } })
  @ApiResponse({ status: 200, description: '修改成功' })
  async updatePassword(@Headers('authorization') auth: string, @Body() body: any) {
    const user = await this.svc.validateToken(getToken(auth));
    return this.svc.updatePassword(user.id, body);
  }

  @Post('findpass/send')
  @ApiOperation({ summary: '发送找回密码邮件' })
  @ApiBody({ schema: { properties: { email: { type: 'string', description: '邮箱地址' } } } })
  @ApiResponse({ status: 200, description: '邮件已发送' })
  async sendFindpassCode(@Body() body: { email: string }) {
    return this.svc.sendFindpassCode(body.email);
  }

  @Post('findpass/reset')
  @ApiOperation({ summary: '通过验证码重置密码' })
  @ApiBody({ schema: { properties: { key: { type: 'string', description: '邮件key' }, code: { type: 'string', description: '验证码' }, newPassword: { type: 'string', description: '新密码' } } } })
  @ApiResponse({ status: 200, description: '重置成功' })
  async resetPasswordByCode(@Body() body: { key: string; code: string; newPassword: string }) {
    return this.svc.resetPasswordByCode(body);
  }

  @Get('favs')
  @ApiOperation({ summary: '获取收藏列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认1' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量，默认20' })
  @ApiResponse({ status: 200, description: '返回收藏列表' })
  async listFavs(
    @Headers('authorization') auth: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const user = await this.svc.validateToken(getToken(auth));
    return this.svc.listUlog(user.id, 2, Number(page) || 1, Math.min(100, Number(pageSize) || 20));
  }

  @Post('favs/add')
  @ApiOperation({ summary: '添加收藏' })
  @ApiBody({ schema: { properties: { mid: { type: 'number', description: '模块ID' }, rid: { type: 'number', description: '资源ID' } } } })
  @ApiResponse({ status: 200, description: '收藏成功' })
  async addFav(@Headers('authorization') auth: string, @Body() body: any) {
    const user = await this.svc.validateToken(getToken(auth));
    return this.svc.addUlog(user.id, { ...body, type: 2 });
  }

  @Post('favs/delete')
  @ApiOperation({ summary: '删除收藏' })
  @ApiBody({ schema: { properties: { ids: { type: 'array', items: { type: 'number' }, description: '收藏ID列表' } } } })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteFavs(@Headers('authorization') auth: string, @Body() body: any) {
    const user = await this.svc.validateToken(getToken(auth));
    const ids = Array.isArray(body.ids) ? body.ids.map((n: any) => Number(n)).filter(Boolean) : [];
    return this.svc.deleteUlog(user.id, ids);
  }

  @Post('favs/clear')
  @ApiOperation({ summary: '清空所有收藏' })
  @ApiResponse({ status: 200, description: '清空成功' })
  async clearFavs(@Headers('authorization') auth: string) {
    const user = await this.svc.validateToken(getToken(auth));
    return this.svc.clearUlog(user.id, 2);
  }

  @Get('plays')
  @ApiOperation({ summary: '获取播放记录' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认1' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量，默认20' })
  @ApiResponse({ status: 200, description: '返回播放记录' })
  async listPlays(
    @Headers('authorization') auth: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const user = await this.svc.validateToken(getToken(auth));
    return this.svc.listUlog(user.id, 1, Number(page) || 1, Math.min(100, Number(pageSize) || 20));
  }

  @Post('plays/add')
  @ApiOperation({ summary: '添加播放记录' })
  @ApiBody({ schema: { properties: { mid: { type: 'number', description: '模块ID' }, rid: { type: 'number', description: '资源ID' } } } })
  @ApiResponse({ status: 200, description: '记录成功' })
  async addPlay(@Headers('authorization') auth: string, @Body() body: any) {
    const user = await this.svc.validateToken(getToken(auth));
    return this.svc.addUlog(user.id, { ...body, type: 1 });
  }

  @Post('plays/delete')
  @ApiOperation({ summary: '删除播放记录' })
  @ApiBody({ schema: { properties: { ids: { type: 'array', items: { type: 'number' }, description: '记录ID列表' } } } })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deletePlays(@Headers('authorization') auth: string, @Body() body: any) {
    const user = await this.svc.validateToken(getToken(auth));
    const ids = Array.isArray(body.ids) ? body.ids.map((n: any) => Number(n)).filter(Boolean) : [];
    return this.svc.deleteUlog(user.id, ids);
  }

  @Post('plays/clear')
  @ApiOperation({ summary: '清空所有播放记录' })
  @ApiResponse({ status: 200, description: '清空成功' })
  async clearPlays(@Headers('authorization') auth: string) {
    const user = await this.svc.validateToken(getToken(auth));
    return this.svc.clearUlog(user.id, 1);
  }
}
