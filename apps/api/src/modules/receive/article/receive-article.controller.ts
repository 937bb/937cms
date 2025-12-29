import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReceiveArticleService } from './receive-article.service';

@ApiTags('receive')
@Controller('api/receive')
export class ReceiveArticleController {
  constructor(private readonly svc: ReceiveArticleService) {}

  @Post('art')
  @HttpCode(200)
  async art(@Body() body: Record<string, any>) {
    return this.svc.receiveArticle(body);
  }
}
