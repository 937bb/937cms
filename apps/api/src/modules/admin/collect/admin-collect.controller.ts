import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CollectService } from '../../collect/collect.service';
import { CollectTaskService } from '../../collect/collect-task.service';
import { GoCollectorRunnerService } from '../../collect/runner/go-collector-runner.service';
import { CollectSearchService } from '../../collect/collect-search.service';
import { AdminGuard } from '../auth/admin.guard';

class CreateSourceDto {
  name!: string;
  base_url!: string;
  collect_type?: number;
  status?: number;
}

class SaveSourceDto {
  id!: number;
  name?: string;
  base_url?: string;
  collect_type?: number;
  status?: number;
}

class DeleteDto {
  id!: number;
  source_ids?: number[];
}

class CreateJobDto {
  name!: string;
  collect_time?: number;
  interval_seconds?: number;
  push_workers?: number;
  push_interval_seconds?: number;
  max_workers?: number;
  cron?: string;
  status?: number;
  source_ids?: number[];
}

class SaveJobDto extends CreateJobDto {
  id!: number;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/collect')
export class AdminCollectController {
  constructor(
    private readonly collect: CollectService,
    private readonly collectTask: CollectTaskService,
    private readonly runner: GoCollectorRunnerService,
    private readonly searchService: CollectSearchService,
  ) {}

  @Get('sources')
  async sources() {
    return this.collect.listSources();
  }

  @Post('sources/create')
  async createSource(@Body() body: CreateSourceDto) {
    return this.collect.createSource(body);
  }

  @Post('sources/save')
  async saveSource(@Body() body: SaveSourceDto) {
    return this.collect.saveSource(body);
  }

  @Post('sources/delete')
  async deleteSource(@Body() body: DeleteDto) {
    return this.collect.deleteSource(Number(body.id));
  }

  @Get('jobs')
  async jobs() {
    return this.collect.listJobs();
  }

  @Post('jobs/create')
  async createJob(@Body() body: CreateJobDto) {
    return this.collect.createJob(body);
  }

  @Post('jobs/save')
  async saveJob(@Body() body: SaveJobDto) {
    return this.collect.saveJob(body);
  }

  @Post('jobs/delete')
  async deleteJob(@Body() body: DeleteDto) {
    return this.collect.deleteJob(Number(body.id));
  }

  @Post('jobs/run')
  async runJob(@Body() body: DeleteDto) {
    const sourceIds = Array.isArray(body.source_ids) ? body.source_ids.map((id) => Number(id)).filter(Number.isFinite) : undefined;
    const res = await this.collect.createRun(Number(body.id), sourceIds);
    // 异步执行，不等待结果: runner 将很快处理.
    this.runner.kick().catch(() => void 0);
    return res;
  }

  @Get('runs')
  async runs(
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('status') statusRaw?: string,
    @Query('job_id') jobIdRaw?: string,
  ) {
    const page = Math.max(1, Number(pageRaw || 1));
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw || 20)));
    const status = statusRaw === undefined || statusRaw === '' ? undefined : Number(statusRaw);
    const jobId = jobIdRaw === undefined || jobIdRaw === '' ? undefined : Number(jobIdRaw);
    return this.collect.listRuns({ page, pageSize, status, jobId });
  }

  @Post('runs/cancel')
  async cancelRun(@Body() body: DeleteDto) {
    return this.collect.cancelRun(Number(body.id));
  }

  @Post('runs/delete')
  async deleteRun(@Body() body: DeleteDto) {
    return this.collect.deleteRun(Number(body.id));
  }

  // ========== 搜索采集功能 ==========

  @Get('search')
  async searchVideos(
    @Query('keyword') keyword: string,
    @Query('source_ids') sourceIdsRaw?: string,
  ) {
    const sourceIds = sourceIdsRaw
      ? sourceIdsRaw.split(',').map((n) => Number(n.trim())).filter(Boolean)
      : [];
    return this.searchService.searchVideos(keyword, sourceIds);
  }

  @Get('tasks')
  async listTasks(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('runId') runId?: string,
    @Query('sourceId') sourceId?: string,
    @Query('status') status?: string,
  ) {
    return this.collectTask.listTasks({
      page: Math.max(1, Number(page || 1)),
      pageSize: Math.min(100, Math.max(1, Number(pageSize || 20))),
      runId: runId ? Number(runId) : undefined,
      sourceId: sourceId ? Number(sourceId) : undefined,
      status: status !== undefined ? Number(status) : undefined,
    });
  }

  @Post('search/collect')
  async collectVideo(@Body() body: { source_id: number; vod_id: number }) {
    return this.searchService.collectSingleVideo(Number(body.source_id), Number(body.vod_id));
  }

  @Post('search/collect-batch')
  async collectVideoBatch(@Body() body: { items: Array<{ source_id: number; vod_id: number }> }) {
    const items = Array.isArray(body.items) ? body.items : [];
    return this.searchService.collectBatch(items);
  }
}
