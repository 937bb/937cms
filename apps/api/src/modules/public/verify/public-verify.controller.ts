import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PublicVerifyService } from './public-verify.service';

@ApiTags('public/verify')
@Controller('api/v1/verify')
export class PublicVerifyController {
  constructor(private readonly svc: PublicVerifyService) {}

  @Get()
  @Header('Content-Type', 'image/svg+xml; charset=utf-8')
  @ApiOperation({ summary: '获取验证码图片' })
  @ApiQuery({ name: 'key', required: true, description: '验证码key' })
  @ApiResponse({ status: 200, description: '返回SVG格式的验证码图片' })
  async image(@Query('key') key: string) {
    return this.svc.issueSvg(key);
  }
}

