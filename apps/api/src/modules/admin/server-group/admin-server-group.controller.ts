import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminServerGroupService } from './admin-server-group.service';

@ApiTags('admin/server-groups')
@UseGuards(AdminGuard)
@Controller('admin/server-groups')
export class AdminServerGroupController {
  constructor(private readonly svc: AdminServerGroupService) {}

  @Get()
  async list() {
    return this.svc.list();
  }

  @Get('detail')
  async detail(@Query('id') id: string) {
    return this.svc.detail(Number(id));
  }

  @Post('save')
  async save(@Body() body: { id?: number; name: string; remark?: string; sort?: number; status?: number }) {
    return this.svc.save(body);
  }

  @Post('delete')
  async delete(@Body() body: { id: number }) {
    return this.svc.delete(body.id);
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
