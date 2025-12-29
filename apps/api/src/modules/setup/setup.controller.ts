import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SetupService, type SetupInput } from './setup.service';

@ApiTags('setup')
@Controller('admin/setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Get('status')
  async status() {
    return this.setup.status();
  }

  @Post()
  async run(@Body() body: SetupInput) {
    return this.setup.run(body);
  }

  @Post('test-mysql')
  @ApiOperation({ summary: '测试 MySQL 连接' })
  async testMysql(@Body() body: { host: string; port: number; user: string; password: string; database?: string }) {
    return this.setup.testMysql(body);
  }

  @Post('test-redis')
  @ApiOperation({ summary: '测试 Redis 连接' })
  async testRedis(@Body() body: { host: string; port: number; password?: string }) {
    return this.setup.testRedis(body);
  }
}

