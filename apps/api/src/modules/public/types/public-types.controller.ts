import { Controller, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicTypesService } from './public-types.service';
import { SessionTokenGuard } from '../session/session-token.guard';

@ApiTags('public')
@UseGuards(SessionTokenGuard)
@Controller('api/v1/types')
export class PublicTypesController {
  constructor(private readonly svc: PublicTypesService) {}

  @Get()
  @ApiOperation({ summary: '获取分类列表' })
  @ApiResponse({ status: 200, description: '返回所有分类列表' })
  async list() {
    return this.svc.list();
  }
}

