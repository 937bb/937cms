import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import {
  SystemSettingsService,
  type SystemSettings,
  type ExtendSettings,
  type UserSettings,
  type SiteSettings,
  type UploadSettings,
  type SeoSettings,
  type CommentSettings,
  type PlaySettings,
  type ApiSettings,
  type EmailSettings,
  type RedisSettings,
} from './system-settings.service';
import { MigrationService } from '../../../db/migration.service';
import { SYSTEM_VERSION } from '../../setup/setup.service';

/**
 * 系统设置控制器
 * 提供系统配置、版本信息、数据库升级等功能
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/system-settings')
export class SystemSettingsController {
  constructor(
    private readonly svc: SystemSettingsService,
    private readonly migration: MigrationService,
  ) {}

  /**
   * 获取系统设置
   */
  @Get()
  @ApiOperation({ summary: '获取系统设置' })
  async get() {
    return this.svc.get();
  }

  /**
   * 保存系统设置
   */
  @Post('save')
  @ApiOperation({ summary: '保存系统设置' })
  async save(@Body() body: SystemSettings) {
    return this.svc.save(body);
  }

  @Get('site')
  @ApiOperation({ summary: '获取站点配置' })
  async getSite() {
    return this.svc.getSite();
  }

  @Post('site')
  @ApiOperation({ summary: '保存站点配置' })
  async saveSite(@Body() body: SiteSettings) {
    return this.svc.saveSite(body);
  }

  /**
   * 获取系统信息
   * 包含版本号、数据库版本、迁移历史等
   */
  @Get('info')
  @ApiOperation({ summary: '获取系统信息' })
  async getInfo() {
    const dbVersion = await this.migration.getCurrentVersion();
    const migrations = await this.migration.getMigrationHistory();

    return {
      version: SYSTEM_VERSION,
      dbVersion,
      migrations,
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  /**
   * 手动执行数据库升级
   * 通常系统启动时会自动执行，此接口用于手动触发
   */
  @Post('upgrade')
  @ApiOperation({ summary: '执行数据库升级' })
  async upgrade() {
    const result = await this.migration.runMigrations();
    return {
      ok: true,
      executed: result.executed,
      message: result.executed > 0 ? `成功执行 ${result.executed} 个迁移` : '数据库已是最新版本',
    };
  }

  @Get('extend')
  @ApiOperation({ summary: '获取扩展分类配置' })
  async getExtend() {
    return this.svc.getExtend();
  }

  @Post('extend')
  @ApiOperation({ summary: '保存扩展分类配置' })
  async saveExtend(@Body() body: ExtendSettings) {
    return this.svc.saveExtend(body);
  }

  @Get('user')
  @ApiOperation({ summary: '获取会员配置' })
  async getUser() {
    return this.svc.getUser();
  }

  @Post('user')
  @ApiOperation({ summary: '保存会员配置' })
  async saveUser(@Body() body: UserSettings) {
    return this.svc.saveUser(body);
  }

  @Get('upload')
  @ApiOperation({ summary: '获取上传配置' })
  async getUpload() {
    return this.svc.getUpload();
  }

  @Post('upload')
  @ApiOperation({ summary: '保存上传配置' })
  async saveUpload(@Body() body: UploadSettings) {
    return this.svc.saveUpload(body);
  }

  @Get('seo')
  @ApiOperation({ summary: '获取 SEO 配置' })
  async getSeo() {
    return this.svc.getSeo();
  }

  @Post('seo')
  @ApiOperation({ summary: '保存 SEO 配置' })
  async saveSeo(@Body() body: SeoSettings) {
    return this.svc.saveSeo(body);
  }

  @Get('comment')
  @ApiOperation({ summary: '获取评论配置' })
  async getComment() {
    return this.svc.getComment();
  }

  @Post('comment')
  @ApiOperation({ summary: '保存评论配置' })
  async saveComment(@Body() body: CommentSettings) {
    return this.svc.saveComment(body);
  }

  @Get('play')
  @ApiOperation({ summary: '获取播放配置' })
  async getPlay() {
    return this.svc.getPlay();
  }

  @Post('play')
  @ApiOperation({ summary: '保存播放配置' })
  async savePlay(@Body() body: PlaySettings) {
    return this.svc.savePlay(body);
  }

  @Get('api')
  @ApiOperation({ summary: '获取 API 配置' })
  async getApi() {
    return this.svc.getApi();
  }

  @Post('api')
  @ApiOperation({ summary: '保存 API 配置' })
  async saveApi(@Body() body: ApiSettings) {
    return this.svc.saveApi(body);
  }

  @Get('email')
  @ApiOperation({ summary: '获取邮件配置' })
  async getEmail() {
    return this.svc.getEmail();
  }

  @Post('email')
  @ApiOperation({ summary: '保存邮件配置' })
  async saveEmail(@Body() body: EmailSettings) {
    return this.svc.saveEmail(body || {});
  }

  @Post('email/test')
  @ApiOperation({ summary: '发送测试邮件' })
  async sendTestEmail(@Body() body: { to: string }) {
    return this.svc.sendTestEmail(body?.to || '');
  }

  @Get('redis')
  @ApiOperation({ summary: '获取 Redis 配置' })
  async getRedis() {
    return this.svc.getRedis();
  }

  @Post('redis')
  @ApiOperation({ summary: '保存 Redis 配置' })
  async saveRedis(@Body() body: RedisSettings) {
    return this.svc.saveRedis(body || {});
  }

  @Post('redis/test')
  @ApiOperation({ summary: '测试 Redis 连接' })
  async testRedisConnection(@Body() body: { host: string; port: number; password: string; db: number }) {
    return this.svc.testRedisConnection(body.host, body.port, body.password, body.db);
  }

  @Post('redis/clear')
  @ApiOperation({ summary: '清理 Redis 缓存' })
  async clearRedisCache() {
    return this.svc.clearRedisCache();
  }
}
