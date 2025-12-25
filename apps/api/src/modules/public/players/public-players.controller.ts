import { Controller, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicPlayersService } from './public-players.service';
import { SessionTokenGuard } from '../session/session-token.guard';

@ApiTags('public')
@UseGuards(SessionTokenGuard)
@Controller('api/v1/players')
export class PublicPlayersController {
  constructor(private readonly svc: PublicPlayersService) {}

  @Get()
  @ApiOperation({ summary: '获取播放器列表' })
  @ApiResponse({ status: 200, description: '返回所有播放器列表' })
  async list() {
    return this.svc.list();
  }
}

