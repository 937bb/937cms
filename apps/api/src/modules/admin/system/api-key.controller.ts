import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { ApiKeyService } from './api-key.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/api-keys')
export class ApiKeyController {
  constructor(private readonly svc: ApiKeyService) {}

  /**
   * 获取所有 API Key
   */
  @Get()
  @ApiOperation({ summary: '获取所有 API Key' })
  async getAll() {
    const keys = await this.svc.getAll();
    return {
      ok: true,
      data: keys.map((k) => ({
        id: k.id,
        name: k.name,
        key: k.key,
        keyDisplay: k.key.substring(0, 8) + '...' + k.key.substring(k.key.length - 8),
        remark: k.remark,
        ip_limit: k.ip_limit,
        enabled: k.enabled,
        created_at: k.created_at,
        last_used_at: k.last_used_at,
      })),
    };
  }

  /**
   * 创建 API Key
   */
  @Post()
  @ApiOperation({ summary: '创建 API Key' })
  async create(@Body() body: { name: string; remark?: string; ip_limit?: string }) {
    const key = await this.svc.create(body.name, body.remark, body.ip_limit);
    return {
      ok: true,
      data: {
        id: key.id,
        name: key.name,
        key: key.key,
        remark: key.remark,
        ip_limit: key.ip_limit,
        enabled: key.enabled,
        created_at: key.created_at,
      },
    };
  }

  /**
   * 更新 API Key
   */
  @Put(':id')
  @ApiOperation({ summary: '更新 API Key' })
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; remark?: string; ip_limit?: string; enabled?: number },
  ) {
    await this.svc.update(parseInt(id), body);
    return { ok: true };
  }

  /**
   * 删除 API Key
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除 API Key' })
  async delete(@Param('id') id: string) {
    await this.svc.delete(parseInt(id));
    return { ok: true };
  }
}
