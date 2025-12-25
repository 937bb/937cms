import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminDownloaderService } from './admin-downloader.service';

@ApiTags('admin/downloaders')
@UseGuards(AdminGuard)
@Controller('admin/downloaders')
export class AdminDownloaderController {
  constructor(private readonly svc: AdminDownloaderService) {}

  @Get()
  async list() {
    return this.svc.list();
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
      from_key: string;
      display_name?: string;
      description?: string;
      tip?: string;
      parse_url?: string;
      parse_mode?: number;
      target?: string;
      downloader_code?: string;
      sort?: number;
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

  @Post('batch-update-status')
  async batchUpdateStatus(@Body() body: { ids: number[]; status: number }) {
    return this.svc.batchUpdateStatus(body.ids, body.status);
  }
}
