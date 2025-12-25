import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as express from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPlayerService, type PlayerUpsert } from './admin-player.service';

/**
 * 播放器管理控制器
 * 提供播放器的增删改查、批量操作、导入导出等功能
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/players')
export class AdminPlayerController {
  constructor(private readonly svc: AdminPlayerService) {}

  /**
   * 获取播放器列表
   */
  @Get()
  @ApiOperation({ summary: '获取播放器列表' })
  async list() {
    return this.svc.list();
  }

  /**
   * 获取单个播放器详情
   */
  @Get(':from_key')
  @ApiOperation({ summary: '获取播放器详情' })
  async get(@Param('from_key') fromKey: string) {
    return this.svc.get(fromKey);
  }

  /**
   * 保存播放器（新增或更新）
   */
  @Post('save')
  @ApiOperation({ summary: '保存播放器' })
  async save(@Body() body: PlayerUpsert) {
    return this.svc.save(body);
  }

  /**
   * 删除单个播放器
   */
  @Post('delete')
  @ApiOperation({ summary: '删除播放器' })
  async delete(@Body() body: { from_key: string }) {
    return this.svc.delete(body?.from_key);
  }

  /**
   * 批量删除播放器
   */
  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除播放器' })
  async batchDelete(@Body() body: { from_keys: string[] }) {
    return this.svc.batchDelete(body?.from_keys);
  }

  /**
   * 批量修改字段
   * 支持修改 status（状态）和 sort（排序）
   */
  @Post('batch-update-field')
  @ApiOperation({ summary: '批量修改字段' })
  async batchUpdateField(@Body() body: { from_keys: string[]; field: string; value: number }) {
    return this.svc.batchUpdateField(body?.from_keys, body?.field, body?.value);
  }

  /**
   * 导出单个播放器配置
   * 返回 Base64 编码的 JSON 数据
   */
  @Get('export/:from_key')
  @ApiOperation({ summary: '导出单个播放器配置' })
  async exportPlayer(@Param('from_key') fromKey: string, @Res() res: express.Response) {
    const data = await this.svc.exportPlayer(fromKey);
    // 设置下载响应头
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=player_${fromKey}.txt`);
    res.send(data);
  }

  /**
   * 导出所有播放器配置
   */
  @Get('export-all')
  @ApiOperation({ summary: '导出所有播放器配置' })
  async exportAll(@Res() res: express.Response) {
    const data = await this.svc.exportAll();
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename=players_all.txt');
    res.send(data);
  }

  /**
   * 导出配置（JSON格式，用于前端预览）
   */
  @Get('export-json/:from_key')
  @ApiOperation({ summary: '导出播放器配置(JSON)' })
  async exportJson(@Param('from_key') fromKey: string) {
    const data = await this.svc.exportPlayer(fromKey);
    return { data };
  }

  /**
   * 导出所有配置（JSON格式）
   */
  @Get('export-all-json')
  @ApiOperation({ summary: '导出所有播放器配置(JSON)' })
  async exportAllJson() {
    const data = await this.svc.exportAll();
    return { data };
  }

  /**
   * 导入播放器配置
   * @param body.data Base64 编码的 JSON 数据
   * @param body.overwrite 是否覆盖已存在的播放器
   */
  @Post('import')
  @ApiOperation({ summary: '导入播放器配置' })
  async importPlayer(@Body() body: { data: string; overwrite?: boolean }) {
    return this.svc.importPlayer(body?.data, body?.overwrite ?? false);
  }
}
