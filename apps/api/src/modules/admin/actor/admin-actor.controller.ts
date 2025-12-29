import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminActorService } from './admin-actor.service';

@ApiTags('admin/actors')
@UseGuards(AdminGuard)
@Controller('admin/actors')
export class AdminActorController {
  constructor(private readonly svc: AdminActorService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string
  ) {
    return this.svc.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      keyword,
      status: status !== undefined && status !== '' ? Number(status) : undefined,
    });
  }

  @Get('detail')
  async detail(@Query('id') id: string) {
    return this.svc.detail(Number(id));
  }

  @Post('save')
  async save(@Body() body: Record<string, any>) {
    return this.svc.save(body);
  }

  @Post('delete')
  async delete(@Body() body: { actor_id: number }) {
    return this.svc.delete(body.actor_id);
  }

  @Post('batch-delete')
  async batchDelete(@Body() body: { ids: number[] }) {
    return this.svc.batchDelete(body.ids);
  }

  @Post('batch-update-status')
  async batchUpdateStatus(@Body() body: { ids: number[]; status: number }) {
    return this.svc.batchUpdateStatus(body.ids, body.status);
  }
}
