import { Controller, UseGuards, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PublicArticlesService } from './public-articles.service';
import { SessionTokenGuard } from '../session/session-token.guard';

@ApiTags('public/articles')
@UseGuards(SessionTokenGuard)
@Controller('api/v1/articles')
export class PublicArticlesController {
  constructor(private readonly svc: PublicArticlesService) {}

  @Get()
  @ApiOperation({ summary: '获取文章列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认1' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量，默认20' })
  @ApiQuery({ name: 'typeId', required: false, description: '分类ID' })
  @ApiQuery({ name: 'keyword', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'sort', required: false, description: '排序字段' })
  @ApiQuery({ name: 'order', required: false, description: '排序顺序' })
  @ApiResponse({ status: 200, description: '返回文章列表' })
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('typeId') typeId?: string,
    @Query('keyword') keyword?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string
  ) {
    return this.svc.list({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      typeId: typeId ? Number(typeId) : undefined,
      keyword,
      sort,
      order,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取文章详情' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiResponse({ status: 200, description: '返回文章详情' })
  async detail(@Param('id') id: string) {
    return this.svc.detail(Number(id));
  }
}
