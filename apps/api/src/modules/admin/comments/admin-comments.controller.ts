import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminCommentsService } from './admin-comments.service';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('admin/comments')
@Controller('admin/comments')
@UseGuards(AdminGuard)
export class AdminCommentsController {
  constructor(private readonly svc: AdminCommentsService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('mid') mid?: string,
    @Query('status') status?: string
  ) {
    return this.svc.list({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      mid: mid ? Number(mid) : undefined,
      status: status !== undefined ? Number(status) : undefined,
    });
  }

  @Post('status')
  async updateStatus(@Body() body: { id: number; status: number }) {
    return this.svc.updateStatus(body.id, body.status);
  }

  @Post('delete')
  async delete(@Body() body: { id: number }) {
    return this.svc.delete(body.id);
  }

  @Post('batch-delete')
  async batchDelete(@Body() body: { ids: number[] }) {
    return this.svc.batchDelete(body.ids);
  }

  @Post('batch-status')
  async batchStatus(@Body() body: { ids: number[]; status: number }) {
    return this.svc.batchUpdateStatus(body.ids, body.status);
  }
}
