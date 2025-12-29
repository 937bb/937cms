import { Controller, Get, Post, Query, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminArticlesService } from './admin-articles.service';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('admin/articles')
@Controller('admin/articles')
@UseGuards(AdminGuard)
export class AdminArticlesController {
  constructor(private readonly svc: AdminArticlesService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('typeId') typeId?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string
  ) {
    return this.svc.list({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      typeId: typeId ? Number(typeId) : undefined,
      keyword,
      status: status !== undefined ? Number(status) : undefined,
    });
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.svc.detail(Number(id));
  }

  @Post('save')
  async save(@Body() body: any) {
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

  @Post('batch-status')
  async batchStatus(@Body() body: { ids: number[]; status: number }) {
    return this.svc.batchUpdateStatus(body.ids, body.status);
  }
}
