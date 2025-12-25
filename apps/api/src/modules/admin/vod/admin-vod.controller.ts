import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminVodService, type VodBatchFieldInput, type VodListInput, type VodSaveInput } from './admin-vod.service';
import { EpisodeService } from './episode.service';

/**
 * 视频管理控制器
 * 提供视频的增删改查、批量操作等功能
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/vods')
export class AdminVodController {
  constructor(
    private readonly svc: AdminVodService,
    private readonly episodeSvc: EpisodeService,
  ) {}

  /**
   * 获取视频列表
   * 支持多种筛选条件
   */
  @Get()
  @ApiOperation({ summary: '获取视频列表' })
  async list(
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('keyword') keyword?: string,
    @Query('typeId') typeIdRaw?: string,
    @Query('status') statusRaw?: string,
    @Query('level') levelRaw?: string,
    @Query('isend') isendRaw?: string,
    @Query('lock') lockRaw?: string,
    @Query('copyright') copyrightRaw?: string,
    @Query('area') area?: string,
    @Query('lang') lang?: string,
    @Query('year') year?: string,
    @Query('player') player?: string,
    @Query('pic') pic?: string,
    @Query('url') url?: string,
    @Query('points') points?: string,
    @Query('plot') plotRaw?: string,
    @Query('order') order?: string,
  ) {
    const input: VodListInput = {
      page: Math.max(1, Number(pageRaw || 1)),
      pageSize: Math.min(100, Math.max(1, Number(pageSizeRaw || 20))),
      keyword,
      typeId: typeIdRaw ? Number(typeIdRaw) : undefined,
      status: statusRaw === undefined || statusRaw === '' ? undefined : Number(statusRaw),
      level: levelRaw === undefined || levelRaw === '' ? undefined : Number(levelRaw),
      isend: isendRaw === undefined || isendRaw === '' ? undefined : Number(isendRaw),
      lock: lockRaw === undefined || lockRaw === '' ? undefined : Number(lockRaw),
      copyright: copyrightRaw === undefined || copyrightRaw === '' ? undefined : Number(copyrightRaw),
      area,
      lang,
      year,
      player,
      pic,
      url,
      points,
      plot: plotRaw === undefined || plotRaw === '' ? undefined : Number(plotRaw),
      order,
    };
    return this.svc.list(input);
  }

  /**
   * 获取视频详情
   */
  @Get('detail/:id')
  @ApiOperation({ summary: '获取视频详情' })
  async get(@Param('id') id: string) {
    return this.svc.get(Number(id));
  }

  /**
   * 获取筛选选项
   */
  @Get('filter-options')
  @ApiOperation({ summary: '获取筛选选项' })
  async getFilterOptions() {
    return this.svc.getFilterOptions();
  }

  /**
   * 获取统计信息
   */
  @Get('stats')
  @ApiOperation({ summary: '获取统计信息' })
  async getStats() {
    return this.svc.getStats();
  }

  /**
   * 保存视频
   */
  @Post('save')
  @ApiOperation({ summary: '保存视频' })
  async save(@Body() body: VodSaveInput) {
    return this.svc.save(body || {});
  }

  /**
   * 删除单个视频
   */
  @Post('delete')
  @ApiOperation({ summary: '删除视频' })
  async del(@Body() body: { vod_id: number }) {
    return this.svc.delete(Number(body?.vod_id));
  }

  /**
   * 批量删除视频
   */
  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除视频' })
  async batchDelete(@Body() body: { ids: number[] }) {
    return this.svc.batchDelete(body?.ids);
  }

  /**
   * 批量修改字段
   * 支持：状态、等级、锁定、版权、点击数、分类
   */
  @Post('batch-update-field')
  @ApiOperation({ summary: '批量修改字段' })
  async batchUpdateField(@Body() body: VodBatchFieldInput) {
    return this.svc.batchUpdateField(body);
  }

  /**
   * 批量删除播放组
   */
  @Post('batch-delete-play-group')
  @ApiOperation({ summary: '批量删除播放组' })
  async batchDeletePlayGroup(@Body() body: { ids: number[]; player: string }) {
    return this.svc.batchDeletePlayGroup(body?.ids, body?.player);
  }

  /**
   * 按筛选条件批量操作
   */
  @Post('batch-by-filter')
  @ApiOperation({ summary: '按筛选条件批量操作' })
  async batchByFilter(@Body() body: { filters: Partial<VodListInput>; action: string; value?: number; start?: number; end?: number }) {
    return this.svc.batchByFilter(body?.filters || {}, body?.action, body?.value, body?.start, body?.end);
  }

  /**
   * 获取重名视频
   */
  @Get('duplicates')
  @ApiOperation({ summary: '获取重名视频' })
  async getDuplicates(@Query('page') pageRaw?: string, @Query('pageSize') pageSizeRaw?: string) {
    return this.svc.getDuplicates(Number(pageRaw || 1), Number(pageSizeRaw || 20));
  }

  // ========== 剧集管理 ==========

  @Get(':id/episodes')
  @ApiOperation({ summary: '获取视频剧集（规范化表）' })
  async getEpisodes(@Param('id') id: string) {
    return this.episodeSvc.getEpisodes(Number(id));
  }

  @Post(':id/episodes')
  @ApiOperation({ summary: '保存视频剧集（规范化表）' })
  async saveEpisodes(@Param('id') id: string, @Body() body: { sources: any[] }) {
    return this.episodeSvc.saveEpisodes(Number(id), body?.sources || []);
  }

  @Post(':id/episodes/:epId')
  @ApiOperation({ summary: '更新单个剧集' })
  async updateEpisode(@Param('id') id: string, @Param('epId') epId: string, @Body() body: any) {
    return this.svc.updateEpisode(Number(id), Number(epId), body);
  }

  @Post(':id/episodes/create')
  @ApiOperation({ summary: '创建新剧集' })
  async createEpisode(@Param('id') id: string, @Body() body: any) {
    return this.svc.createEpisode(Number(id), body);
  }

  @Post(':id/episodes/sync-to-normalized')
  @ApiOperation({ summary: '同步单个视频到规范化表' })
  async syncToNormalized(@Param('id') id: string) {
    return this.episodeSvc.syncVodToNormalized(Number(id));
  }

  @Post(':id/episodes/sync-from-normalized')
  @ApiOperation({ summary: '从规范化表同步回vod_play_url' })
  async syncFromNormalized(@Param('id') id: string) {
    return this.episodeSvc.syncVodFromNormalized(Number(id));
  }

  @Post('episodes/sync-all')
  @ApiOperation({ summary: '批量同步所有视频到规范化表' })
  async syncAllToNormalized(@Body() body?: { batchSize?: number }) {
    return this.episodeSvc.syncAllToNormalized(body?.batchSize || 100);
  }
}
