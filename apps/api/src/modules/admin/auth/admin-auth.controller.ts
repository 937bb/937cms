import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminGuard } from './admin.guard';

class AdminLoginDto {
  username!: string;
  password!: string;
}

@ApiTags('admin')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('login')
  async login(@Body() body: AdminLoginDto) {
    return this.auth.login(body.username, body.password);
  }
}

@ApiTags('admin')
@Controller('admin/admins')
@UseGuards(AdminGuard)
export class AdminManageController {
  constructor(private readonly auth: AdminAuthService) {}

  @Get()
  @ApiOperation({ summary: '管理员列表' })
  async list() {
    return this.auth.list();
  }

  @Post('create')
  @ApiOperation({ summary: '创建管理员' })
  async create(@Body() body: { username: string; password: string; role?: string }) {
    return this.auth.create(body);
  }

  @Post('password')
  @ApiOperation({ summary: '修改自己的密码' })
  async updatePassword(@Req() req: any, @Body() body: { oldPassword: string; newPassword: string }) {
    const adminId = req.user?.sub;
    return this.auth.updatePassword(adminId, body.oldPassword, body.newPassword);
  }

  @Post('reset-password')
  @ApiOperation({ summary: '重置其他管理员密码' })
  async resetPassword(@Body() body: { id: number; newPassword: string }) {
    return this.auth.resetPassword(body.id, body.newPassword);
  }

  @Post('delete')
  @ApiOperation({ summary: '删除管理员' })
  async delete(@Body() body: { id: number }) {
    return this.auth.delete(body.id);
  }
}
