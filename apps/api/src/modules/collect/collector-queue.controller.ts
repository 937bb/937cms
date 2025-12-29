import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CollectService } from './collect.service';
import { CollectTaskService } from './collect-task.service';
import { CollectorGuard } from './collector.guard';

class PullDto {
  worker_id?: string;
}

class ReportDto {
  id!: number;
  task_id?: number;
  status?: number;
  progress_page?: number;
  progress_total_pages?: number;
  pushed_count?: number;
  updated_count?: number;
  created_count?: number;
  error_count?: number;
  message?: string;
}

@ApiTags('collector')
@UseGuards(CollectorGuard)
@Controller('collector/queue')
export class CollectorQueueController {
  constructor(
    private readonly collect: CollectService,
    private readonly collectTask: CollectTaskService,
  ) {}

  @Post('pull')
  @HttpCode(200)
  async pull(@Body() body: PullDto) {
    return this.collect.pullNextRun(String(body?.worker_id || 'worker'));
  }

  @Post('report')
  @HttpCode(200)
  async report(@Body() body: ReportDto) {
    return this.collect.reportRun(body as any);
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

  @Get('task-stats/:runId')
  async getTaskStats(@Query('runId') runId?: string) {
    if (!runId) return { ok: false, message: 'runId required' };
    return this.collectTask.getTaskStats(Number(runId));
  }
}


