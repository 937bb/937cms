import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminDatabaseService } from './admin-database.service';

@ApiTags('admin/database')
@Controller('admin/database')
@UseGuards(AdminGuard)
export class AdminDatabaseController {
  constructor(private readonly svc: AdminDatabaseService) {}

  @Get('tables')
  @ApiOperation({ summary: '获取表列表' })
  async listTables() {
    return this.svc.listTables();
  }

  @Get('describe')
  @ApiOperation({ summary: '获取表结构' })
  async describeTable(@Query('table') table: string) {
    return this.svc.describeTable(table);
  }

  @Post('replace')
  @ApiOperation({ summary: '批量替换' })
  async batchReplace(@Body() body: { table: string; field: string; search: string; replace: string; where?: string }) {
    return this.svc.batchReplace(body);
  }

  @Post('query')
  @ApiOperation({ summary: '执行查询' })
  async executeQuery(@Body() body: { sql: string }) {
    return this.svc.executeQuery(body.sql);
  }

  @Post('execute')
  @ApiOperation({ summary: '执行更新' })
  async executeUpdate(@Body() body: { sql: string; confirmed: boolean }) {
    return this.svc.executeUpdate(body.sql, body.confirmed);
  }

  @Post('optimize')
  @ApiOperation({ summary: '优化表' })
  async optimizeTable(@Body() body: { table: string }) {
    return this.svc.optimizeTable(body.table);
  }

  @Post('repair')
  @ApiOperation({ summary: '修复表' })
  async repairTable(@Body() body: { table: string }) {
    return this.svc.repairTable(body.table);
  }

  @Post('optimize-all')
  @ApiOperation({ summary: '优化所有表' })
  async optimizeAllTables() {
    return this.svc.optimizeAllTables();
  }

  @Post('truncate')
  @ApiOperation({ summary: '清空表' })
  async truncateTable(@Body() body: { table: string; confirmed: boolean }) {
    return this.svc.truncateTable(body.table, body.confirmed);
  }
}
