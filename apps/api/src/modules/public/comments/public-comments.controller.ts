import { Controller, UseGuards, Get, Post, Query, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import type { Request } from 'express';
import { PublicCommentsService } from './public-comments.service';
import { SessionTokenGuard } from '../session/session-token.guard';

@ApiTags('public/comments')
@UseGuards(SessionTokenGuard)
@Controller('api/v1/comments')
export class PublicCommentsController {
  constructor(private readonly svc: PublicCommentsService) {}

  @Get()
  @ApiOperation({ summary: '获取评论列表' })
  @ApiQuery({ name: 'mid', required: true, description: '模块ID' })
  @ApiQuery({ name: 'rid', required: true, description: '资源ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认1' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量，默认20' })
  @ApiResponse({ status: 200, description: '返回评论列表' })
  async list(
    @Query('mid') mid: string,
    @Query('rid') rid: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.svc.list(Number(mid) || 1, Number(rid), Number(page) || 1, Number(pageSize) || 20);
  }

  @Post('add')
  @ApiOperation({ summary: '添加评论' })
  @ApiBody({ schema: { properties: { mid: { type: 'number', description: '模块ID' }, rid: { type: 'number', description: '资源ID' }, pid: { type: 'number', description: '父评论ID' }, userId: { type: 'number', description: '用户ID' }, name: { type: 'string', description: '评论者名称' }, content: { type: 'string', description: '评论内容' } } } })
  @ApiResponse({ status: 200, description: '评论已添加' })
  async add(
    @Body() body: { mid: number; rid: number; pid?: number; userId?: number; name?: string; content: string },
    @Req() req: Request
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '';
    return this.svc.add({ ...body, ip });
  }

  @Post('digg')
  @ApiOperation({ summary: '评论点赞/点踩' })
  @ApiBody({ schema: { properties: { id: { type: 'number', description: '评论ID' }, type: { type: 'string', enum: ['up', 'down'], description: '点赞或点踩' } } } })
  @ApiResponse({ status: 200, description: '操作成功' })
  async digg(@Body() body: { id: number; type: 'up' | 'down' }) {
    return this.svc.digg(body.id, body.type);
  }
}
