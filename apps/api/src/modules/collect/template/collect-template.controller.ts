import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../admin/auth/admin.guard';
import { CollectTemplateService, CollectTemplateConfig } from './collect-template.service';

@Controller('admin/collect/templates')
@UseGuards(AdminGuard)
export class CollectTemplateController {
  constructor(private readonly templateService: CollectTemplateService) {}

  @Get()
  async list() {
    return this.templateService.listTemplates();
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.templateService.getTemplate(Number(id));
  }

  @Post()
  async create(@Body() input: {
    name: string;
    type: number;
    description?: string;
    config: CollectTemplateConfig;
    status?: number;
  }) {
    return this.templateService.createTemplate(input);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() input: Partial<{
      name: string;
      description: string;
      config: CollectTemplateConfig;
      status: number;
    }>,
  ) {
    return this.templateService.updateTemplate(Number(id), input);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.templateService.deleteTemplate(Number(id));
  }

  @Post(':id/test')
  async testTemplate(
    @Param('id') id: string,
    @Body() input: { testUrl: string; pageNum?: number },
  ) {
    // TODO: 实现模板测试功能
    // 1. 获取模板配置
    // 2. 根据 testUrl 和 pageNum 构建请求
    // 3. 获取页面内容
    // 4. 使用 cheerio 解析 HTML
    // 5. 根据 XPath 提取数据
    // 6. 返回预览数据

    return {
      ok: true,
      preview: [],
      message: 'Template test not implemented yet',
    };
  }
}
