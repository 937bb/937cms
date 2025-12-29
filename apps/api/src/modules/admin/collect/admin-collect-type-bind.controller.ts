import { Body, Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { CollectTypeBindService } from '../../collect/type-bind/collect-type-bind.service';

@ApiTags('admin/collect')
@UseGuards(AdminGuard)
@Controller('admin/collect/type-bind')
export class AdminCollectTypeBindController {
  constructor(private readonly svc: CollectTypeBindService) {}

  @Get('list')
  async list(@Query('source_id') sourceId: string) {
    return this.svc.listBindings(Number(sourceId));
  }

  @Post('save')
  async save(
    @Body()
    body: {
      source_id: number;
      remote_type_id: number;
      remote_type_name?: string;
      local_type_id: number;
    },
  ) {
    return this.svc.saveBind(body);
  }

  @Post('save-batch')
  async saveBatch(
    @Body()
    body: {
      source_id: number;
      bindings: Array<{ remote_type_id: number; remote_type_name?: string; local_type_id: number }>;
    },
  ) {
    return this.svc.saveBindBatch(body.source_id, body.bindings);
  }

  @Delete('delete')
  async delete(@Query('source_id') sourceId: string, @Query('remote_type_id') remoteTypeId: string) {
    return this.svc.deleteBind(Number(sourceId), Number(remoteTypeId));
  }

  @Get('fetch-remote')
  async fetchRemote(@Query('base_url') baseUrl: string) {
    return this.svc.fetchRemoteTypes(baseUrl);
  }
}
