import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminMemberService, type GroupSaveInput, type MemberSaveInput } from './admin-member.service';

/**
 * 会员管理控制器
 * 提供会员和会员组的增删改查、批量操作等功能
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/members')
export class AdminMemberController {
  constructor(private readonly svc: AdminMemberService) {}

  // ==================== 会员组接口 ====================

  /**
   * 获取会员组列表
   */
  @Get('groups')
  @ApiOperation({ summary: '获取会员组列表' })
  async groups() {
    return this.svc.listGroups();
  }

  /**
   * 获取会员组详情
   */
  @Get('groups/detail/:id')
  @ApiOperation({ summary: '获取会员组详情' })
  async getGroup(@Param('id') id: string) {
    return this.svc.getGroup(Number(id));
  }

  /**
   * 获取会员组选项（用于下拉选择）
   */
  @Get('groups/options')
  @ApiOperation({ summary: '获取会员组选项' })
  async getGroupOptions() {
    return this.svc.getGroupOptions();
  }

  /**
   * 保存会员组（新增或更新）
   */
  @Post('groups/save')
  @ApiOperation({ summary: '保存会员组' })
  async saveGroup(@Body() body: GroupSaveInput) {
    return this.svc.saveGroup(body || {});
  }

  /**
   * 删除会员组
   */
  @Post('groups/delete')
  @ApiOperation({ summary: '删除会员组' })
  async deleteGroup(@Body() body: { id: number }) {
    return this.svc.deleteGroup(Number(body?.id));
  }

  /**
   * 批量修改会员组状态
   */
  @Post('groups/batch-update-status')
  @ApiOperation({ summary: '批量修改会员组状态' })
  async batchUpdateGroupStatus(@Body() body: { ids: number[]; status: number }) {
    return this.svc.batchUpdateGroupStatus(body?.ids, body?.status);
  }

  // ==================== 会员接口 ====================

  /**
   * 获取会员列表
   */
  @Get()
  @ApiOperation({ summary: '获取会员列表' })
  async members(
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
    @Query('status') statusRaw?: string,
    @Query('group_id') groupIdRaw?: string,
  ) {
    const page = Math.max(1, Number(pageRaw || 1));
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw || 20)));
    const status = statusRaw === undefined || statusRaw === '' ? undefined : Number(statusRaw);
    const groupId = groupIdRaw === undefined || groupIdRaw === '' ? undefined : Number(groupIdRaw);
    return this.svc.listMembers({ page, pageSize, q: String(q || '').trim(), status, groupId });
  }

  /**
   * 获取会员详情
   */
  @Get('detail/:id')
  @ApiOperation({ summary: '获取会员详情' })
  async getMember(@Param('id') id: string) {
    return this.svc.getMember(Number(id));
  }

  /**
   * 保存会员信息
   */
  @Post('save')
  @ApiOperation({ summary: '保存会员信息' })
  async saveMember(@Body() body: MemberSaveInput) {
    if (!body?.id) throw new BadRequestException('id 必填');
    return this.svc.saveMember(body);
  }

  /**
   * 重置会员密码
   */
  @Post('reset-password')
  @ApiOperation({ summary: '重置会员密码' })
  async resetPassword(@Body() body: { id: number; password: string }) {
    if (!body?.id) throw new BadRequestException('id 必填');
    if (!String(body.password || '').trim()) throw new BadRequestException('password 必填');
    return this.svc.resetMemberPassword(Number(body.id), String(body.password));
  }

  /**
   * 删除会员
   */
  @Post('delete')
  @ApiOperation({ summary: '删除会员' })
  async deleteMember(@Body() body: { id: number }) {
    if (!body?.id) throw new BadRequestException('id 必填');
    return this.svc.deleteMember(Number(body.id));
  }

  /**
   * 批量删除会员
   */
  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除会员' })
  async batchDeleteMembers(@Body() body: { ids: number[] }) {
    return this.svc.batchDeleteMembers(body?.ids);
  }

  /**
   * 批量修改会员字段
   */
  @Post('batch-update-field')
  @ApiOperation({ summary: '批量修改会员字段' })
  async batchUpdateMemberField(@Body() body: { ids: number[]; field: string; value: number }) {
    return this.svc.batchUpdateMemberField(body?.ids, body?.field, body?.value);
  }
}
