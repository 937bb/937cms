import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminTypeService, type TypeBatchSaveItem, type TypeSaveInput } from './admin-type.service';

/**
 * 分类管理控制器
 * 提供分类的增删改查、批量操作、扩展配置等功能
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/types')
export class AdminTypeController {
  constructor(private readonly svc: AdminTypeService) {}

  /**
   * 获取分类列表（树形结构）
   */
  @Get()
  @ApiOperation({ summary: '获取分类列表' })
  async list() {
    return this.svc.list();
  }

  /**
   * 获取分类详情
   */
  @Get('detail/:id')
  @ApiOperation({ summary: '获取分类详情' })
  async get(@Param('id') id: string) {
    return this.svc.get(Number(id));
  }

  /**
   * 获取分类选项（用于下拉选择）
   */
  @Get('options')
  @ApiOperation({ summary: '获取分类选项' })
  async getOptions() {
    return this.svc.getOptions();
  }

  /**
   * 获取扩展配置
   */
  @Get('extend/:id')
  @ApiOperation({ summary: '获取扩展配置' })
  async getExtend(@Param('id') id: string) {
    return this.svc.getExtend(Number(id));
  }

  /**
   * 保存分类
   */
  @Post('save')
  @ApiOperation({ summary: '保存分类' })
  async save(@Body() body: TypeSaveInput) {
    return this.svc.save(body || {});
  }

  /**
   * 批量保存分类
   */
  @Post('batch-save')
  @ApiOperation({ summary: '批量保存分类' })
  async batchSave(@Body() body: { items: TypeBatchSaveItem[] }) {
    return this.svc.batchSave(body?.items || []);
  }

  /**
   * 删除分类
   */
  @Post('delete')
  @ApiOperation({ summary: '删除分类' })
  async del(@Body() body: { type_id: number }) {
    return this.svc.delete(Number(body?.type_id));
  }

  /**
   * 批量修改字段
   */
  @Post('batch-update-field')
  @ApiOperation({ summary: '批量修改字段' })
  async batchUpdateField(@Body() body: { ids: number[]; field: string; value: number }) {
    return this.svc.batchUpdateField(body?.ids, body?.field, body?.value);
  }

  /**
   * 移动分类
   */
  @Post('move')
  @ApiOperation({ summary: '移动分类' })
  async move(@Body() body: { ids: number[]; target_pid: number }) {
    return this.svc.move(body?.ids, body?.target_pid);
  }

  /**
   * 保存扩展配置
   */
  @Post('save-extend')
  @ApiOperation({ summary: '保存扩展配置' })
  async saveExtend(@Body() body: { type_id: number; extend: Record<string, string> }) {
    return this.svc.saveExtend(body?.type_id, body?.extend);
  }
}
