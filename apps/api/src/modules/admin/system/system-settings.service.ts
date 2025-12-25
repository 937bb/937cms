import { BadRequestException, Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

function isPlainObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function mergeDeep<T>(base: T, patch: any): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch as T;
  const out: any = { ...(base as any) };
  for (const [k, v] of Object.entries(patch)) {
    if (isPlainObject(v) && isPlainObject(out[k])) out[k] = mergeDeep(out[k], v);
    else out[k] = v;
  }
  return out as T;
}

export type SystemSettings = {
  interfacePass?: string;
  siteName?: string;
  tmdbApiKey?: string;
};

export type SeoSettings = {
  homeTitle?: string;
  homeKeywords?: string;
  homeDescription?: string;
  vodTitleTpl?: string;
  vodKeywordsTpl?: string;
  vodDescriptionTpl?: string;
  playTitleTpl?: string;
  playKeywordsTpl?: string;
  playDescriptionTpl?: string;
  listTitleTpl?: string;
  listKeywordsTpl?: string;
  listDescriptionTpl?: string;
};

export type CommentSettings = {
  enabled?: number; // 1/0
  audit?: number; // 1=need audit => status=0
  needLogin?: number; // 1/0
  maxLen?: number;
  cooldownSeconds?: number;
};

export type PlaySettings = {
  trysee?: number; // seconds
  points?: number; // cost points
};

export type ApiSettings = {
  provideEnabled?: number; // 1/0
  providePass?: string; // optional token
};

export type EmailSettings = {
  enabled?: number; // 1/0
  host?: string; // SMTP 主机
  port?: number; // SMTP 端口
  secure?: number; // 1=SSL/TLS, 0=STARTTLS
  user?: string; // SMTP 用户名
  pass?: string; // SMTP 密码
  from?: string; // 发件人地址
  nick?: string; // 发件人昵称
  timeout?: number; // 超时时间（秒）
  tpl?: {
    testTitle?: string;
    testBody?: string;
    regTitle?: string;
    regBody?: string;
    bindTitle?: string;
    bindBody?: string;
    findpassTitle?: string;
    findpassBody?: string;
  };
};

export type RedisCacheModuleConfig = {
  enabled?: number; // 1/0 是否启用该模块的缓存
  ttl?: number; // 缓存时间（秒）
};

export type RedisSettings = {
  enabled?: number; // 1/0
  host?: string;
  port?: number;
  password?: string;
  db?: number; // Redis database (0-15)
  keyPrefix?: string; // 缓存 key 前缀
  cacheTtl?: number; // 默认缓存时间（秒）
  modules?: {
    vodQuery?: RedisCacheModuleConfig; // 视频查询缓存
    search?: RedisCacheModuleConfig; // 搜索缓存
    theme?: RedisCacheModuleConfig; // 主题缓存
    config?: RedisCacheModuleConfig; // 配置缓存
    types?: RedisCacheModuleConfig; // 分类缓存
  };
};

export type SiteSettings = {
  siteName?: string;
  siteUrl?: string;
  siteLogo?: string;
  siteLogoDark?: string;
  siteFavicon?: string;
  siteKeywords?: string;
  siteDescription?: string;
  siteIcp?: string;
  siteCopyright?: string;
  searchHot?: string;
  searchPlaceholder?: string;
};

export type UserSettings = {
  status?: number;
  regStatus?: number;
  regVerify?: number;
  loginVerify?: number;
};

export type ExtendSettings = {
  vodExtendClass?: string;
  vodExtendArea?: string;
  vodExtendLang?: string;
  vodExtendYear?: string;
  vodExtendVersion?: string;
  vodExtendState?: string;
};

export type UploadSettings = {
  maxMb?: number;
  allowSvg?: number;
  allowAny?: number;
};

const SETTINGS_KEY = 'system';
const SITE_KEY = 'site';
const EXTEND_KEY = 'extend';
const USER_KEY = 'user';
const UPLOAD_KEY = 'upload';
const SEO_KEY = 'seo';
const COMMENT_KEY = 'comment';
const PLAY_KEY = 'play';
const API_KEY = 'api';
const EMAIL_KEY = 'email';
const REDIS_KEY = 'redis';

@Injectable()
export class SystemSettingsService {
  constructor(private readonly db: MySQLService) {}

  private async getByKey<T extends Record<string, any>>(key: string): Promise<T> {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT value_json FROM bb_setting WHERE `key` = ? LIMIT 1',
      [key],
    );
    const row = rows?.[0];
    if (!row?.value_json) return {} as T;
    try {
      const parsed = JSON.parse(String(row.value_json || '{}'));
      return (isPlainObject(parsed) ? parsed : {}) as T;
    } catch {
      return {} as T;
    }
  }

  private async getByKeyWithDefaults<T extends Record<string, any>>(key: string, defaults: T): Promise<T> {
    const got = await this.getByKey<T>(key);
    return mergeDeep(defaults, got);
  }

  private async saveByKey<T extends Record<string, any>>(key: string, partial: T) {
    const pool = this.db.getPool();
    const existing = await this.getByKey<T>(key);
    const merged = mergeDeep(existing, partial);
    const now = Math.floor(Date.now() / 1000);
    await pool.query(
      'INSERT INTO bb_setting (`key`, value_json, updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value_json=VALUES(value_json), updated_at=VALUES(updated_at)',
      [key, JSON.stringify(merged), now],
    );
    return { ok: true, updatedAt: now, value: merged };
  }

  async get(): Promise<SystemSettings> {
    return this.getByKey<SystemSettings>(SETTINGS_KEY);
  }

  async save(partial: SystemSettings) {
    if (partial.interfacePass !== undefined) {
      const p = String(partial.interfacePass || '').trim();
      if (p && p.length < 16) throw new BadRequestException('interfacePass too short (min 16)');
    }
    return this.saveByKey<SystemSettings>(SETTINGS_KEY, partial);
  }

  async getSite(): Promise<SiteSettings> {
    return this.getByKey<SiteSettings>(SITE_KEY);
  }

  async saveSite(partial: SiteSettings) {
    return this.saveByKey<SiteSettings>(SITE_KEY, partial);
  }

  async getUser(): Promise<UserSettings> {
    return this.getByKey<UserSettings>(USER_KEY);
  }

  async saveUser(partial: UserSettings) {
    return this.saveByKey<UserSettings>(USER_KEY, partial);
  }

  async getExtend(): Promise<ExtendSettings> {
    return this.getByKey<ExtendSettings>(EXTEND_KEY);
  }

  async saveExtend(partial: ExtendSettings) {
    return this.saveByKey<ExtendSettings>(EXTEND_KEY, partial);
  }

  async getUpload(): Promise<UploadSettings> {
    return this.getByKey<UploadSettings>(UPLOAD_KEY);
  }

  async saveUpload(partial: UploadSettings) {
    return this.saveByKey<UploadSettings>(UPLOAD_KEY, partial);
  }

  async getSeo(): Promise<SeoSettings> {
    return this.getByKey<SeoSettings>(SEO_KEY);
  }

  async saveSeo(partial: SeoSettings) {
    return this.saveByKey<SeoSettings>(SEO_KEY, partial);
  }

  async getComment(): Promise<CommentSettings> {
    return this.getByKeyWithDefaults<CommentSettings>(COMMENT_KEY, {
      enabled: 1,
      audit: 0,
      needLogin: 0,
      maxLen: 300,
      cooldownSeconds: 10,
    });
  }

  async saveComment(partial: CommentSettings) {
    return this.saveByKey<CommentSettings>(COMMENT_KEY, partial);
  }

  async getPlay(): Promise<PlaySettings> {
    return this.getByKeyWithDefaults<PlaySettings>(PLAY_KEY, { trysee: 0, points: 0 });
  }

  async savePlay(partial: PlaySettings) {
    return this.saveByKey<PlaySettings>(PLAY_KEY, partial);
  }

  async getApi(): Promise<ApiSettings> {
    return this.getByKeyWithDefaults<ApiSettings>(API_KEY, { provideEnabled: 1, providePass: '' });
  }

  async saveApi(partial: ApiSettings) {
    return this.saveByKey<ApiSettings>(API_KEY, partial);
  }

  async getEmail(): Promise<EmailSettings> {
    return this.getByKeyWithDefaults<EmailSettings>(EMAIL_KEY, {
      enabled: 0,
      host: '',
      port: 465,
      secure: 1,
      user: '',
      pass: '',
      from: '',
      nick: '',
      timeout: 30,
      tpl: {
        testTitle: '测试邮件 - {sitename}',
        testBody: '这是一封测试邮件，如果您收到此邮件，说明邮件配置正确。',
        regTitle: '注册验证码 - {sitename}',
        regBody: '您的注册验证码是：{code}，有效期 {time} 分钟。',
        bindTitle: '绑定验证码 - {sitename}',
        bindBody: '您的绑定验证码是：{code}，有效期 {time} 分钟。',
        findpassTitle: '找回密码 - {sitename}',
        findpassBody: '您的找回密码验证码是：{code}，有效期 {time} 分钟。',
      },
    });
  }
  async saveEmail(partial: EmailSettings) {
    return this.saveByKey<EmailSettings>(EMAIL_KEY, partial);
  }

  async getRedis(): Promise<RedisSettings> {
    return this.getByKeyWithDefaults<RedisSettings>(REDIS_KEY, {
      enabled: 0,
      host: '127.0.0.1',
      port: 6379,
      password: '',
      db: 0,
      keyPrefix: 'cms:',
      cacheTtl: 3600,
      modules: {
        vodQuery: { enabled: 1, ttl: 3600 },
        search: { enabled: 1, ttl: 600 },
        theme: { enabled: 1, ttl: 3600 },
        config: { enabled: 1, ttl: 3600 },
        types: { enabled: 1, ttl: 3600 },
      },
    });
  }
  async saveRedis(partial: RedisSettings) {
    return this.saveByKey<RedisSettings>(REDIS_KEY, partial);
  }

  /**
   * 清理 Redis 缓存
   */
  async clearRedisCache(): Promise<{ ok: boolean; message: string; cleared?: number }> {
    const settings = await this.getRedis();
    if (!settings.enabled) {
      return { ok: false, message: 'Redis 未启用' };
    }

    try {
      const { default: Redis } = await import('ioredis');
      const client = new (Redis as any)({
        host: settings.host || '127.0.0.1',
        port: settings.port || 6379,
        password: settings.password || undefined,
        db: settings.db || 0,
        connectTimeout: 5000,
      });

      const prefix = settings.keyPrefix || 'cms:';
      const keys = await client.keys(`${prefix}*`);
      let cleared = 0;
      if (keys.length > 0) {
        cleared = await client.del(...keys);
      }
      await client.quit();
      return { ok: true, message: `已清理 ${cleared} 个缓存`, cleared };
    } catch (e: any) {
      return { ok: false, message: `清理失败: ${e.message || e}` };
    }
  }

  /**
   * 测试 Redis 连接
   */
  async testRedisConnection(host: string, port: number, password: string, db: number): Promise<{ ok: boolean; message: string }> {
    try {
      const { default: Redis } = await import('ioredis');
      const client = new (Redis as any)({
        host: host || '127.0.0.1',
        port: port || 6379,
        password: password || undefined,
        db: db || 0,
        connectTimeout: 5000,
      });

      await client.ping();
      await client.quit();
      return { ok: true, message: 'Redis 连接成功' };
    } catch (e: any) {
      return { ok: false, message: `连接失败: ${e.message || e}` };
    }
  }

  /**
   * 发送测试邮件
   */
  async sendTestEmail(to: string): Promise<{ ok: boolean; message: string }> {
    const settings = await this.getEmail();
    if (!settings.enabled) {
      return { ok: false, message: '邮件功能未启用' };
    }
    if (!settings.host || !settings.user || !settings.pass) {
      return { ok: false, message: '请先配置 SMTP 服务器信息' };
    }
    if (!to) {
      return { ok: false, message: '请输入收件人邮箱' };
    }

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port || 465,
        secure: settings.secure === 1,
        auth: { user: settings.user, pass: settings.pass },
        connectionTimeout: (settings.timeout || 30) * 1000,
      });

      const siteSettings = await this.getSite();
      const siteName = siteSettings.siteName || '937 CMS';
      const subject = (settings.tpl?.testTitle || '测试邮件').replace('{sitename}', siteName);
      const text = (settings.tpl?.testBody || '这是一封测试邮件').replace('{sitename}', siteName);

      await transporter.sendMail({
        from: settings.nick ? `"${settings.nick}" <${settings.from || settings.user}>` : (settings.from || settings.user),
        to,
        subject,
        text,
      });

      return { ok: true, message: '测试邮件发送成功' };
    } catch (e: any) {
      return { ok: false, message: `发送失败: ${e.message || e}` };
    }
  }
}
