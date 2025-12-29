import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminAttachmentService } from './admin-attachment.service';

@ApiTags('admin/attachments')
@UseGuards(AdminGuard)
@Controller('admin/attachments')
export class AdminAttachmentController {
  constructor(private readonly svc: AdminAttachmentService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('module') module?: string
  ) {
    return this.svc.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      keyword,
      module,
    });
  }

  @Get('detail')
  async detail(@Query('id') id: string) {
    return this.svc.detail(Number(id));
  }

  @Post('save')
  async save(
    @Body()
    body: {
      id?: number;
      name: string;
      path: string;
      url: string;
      size?: number;
      mime_type?: string;
      ext?: string;
      md5?: string;
      module?: string;
      ref_id?: number;
      admin_id?: number;
      member_id?: number;
      status?: number;
    }
  ) {
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
}
