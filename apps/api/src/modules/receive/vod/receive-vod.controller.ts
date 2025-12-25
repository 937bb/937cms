import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReceiveVodService } from './receive-vod.service';

@ApiTags('receive')
@Controller('api/receive')
export class ReceiveVodController {
  constructor(private readonly svc: ReceiveVodService) {}

  @Post('vod')
  @HttpCode(200)
  async vod(@Body() body: Record<string, any>) {
    return this.svc.receiveVod(body);
  }
}
