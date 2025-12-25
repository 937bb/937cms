import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGbookService } from './admin-gbook.service';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('admin/gbook')
@Controller('admin/gbook')
@UseGuards(AdminGuard)
export class AdminGbookController {
  constructor(private readonly svc: AdminGbookService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string
  ) {
    return this.svc.list({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      status: status !== undefined ? Number(status) : undefined,
    });
  }

  @Post('reply')
  async reply(@Body() body: { id: number; reply: string }) {
    return this.svc.reply(body.id, body.reply);
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
