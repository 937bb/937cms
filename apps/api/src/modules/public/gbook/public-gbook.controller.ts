import { Body, Controller, Get, Headers, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PublicGbookService } from './public-gbook.service';
import { PublicUserService } from '../user/public-user.service';
import { SessionTokenGuard } from '../session/session-token.guard';
import type { Request } from 'express';

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

@ApiTags('public/gbook')
@Controller('api/v1/gbook')
@UseGuards(SessionTokenGuard)
export class PublicGbookController {
  constructor(
    private readonly svc: PublicGbookService,
    private readonly userSvc: PublicUserService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取留言列表' })
  @ApiQuery({ name: 'rid', required: false, description: '回复ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认1' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量，默认20' })
  @ApiResponse({ status: 200, description: '返回留言列表' })
  async list(@Query('rid') rid?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.svc.list({
      rid: Number(rid) || 0,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Post('add')
  @ApiOperation({ summary: '添加留言' })
  @ApiBody({ schema: { properties: { rid: { type: 'number', description: '回复ID' }, name: { type: 'string', description: '留言者名称' }, content: { type: 'string', description: '留言内容' } } } })
  @ApiResponse({ status: 200, description: '留言已添加' })
  async add(@Body() body: any, @Headers('authorization') auth: string, @Req() req: Request) {
    const token = getToken(auth);
    let userId = 0;
    let name = String(body.name || '').trim() || '游客';

    // 如果有 token，尝试获取用户信息
    if (token) {
      try {
        const user = await this.userSvc.validateToken(token);
        userId = user.id;
        name = user.nickname || user.username || name;
      } catch {
        // token 无效，作为游客留言
      }
    }

    return this.svc.add(
      {
        rid: Number(body.rid) || 0,
        name,
        content: body.content,
        userId,
      },
      getClientIp(req),
    );
  }
}
