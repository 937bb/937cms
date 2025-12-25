import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { RedisCacheService } from '../../../cache/redis-cache.service';
import { RedisCacheConfigService } from '../../../cache/redis-cache-config.service';
import type { RowDataPacket } from 'mysql2/promise';

@Injectable()
export class PublicConfigService {
  constructor(
    private readonly db: MySQLService,
    private readonly cache: RedisCacheService,
    private readonly cacheConfig: RedisCacheConfigService,
  ) {}

  private get pool() {
    return this.db.getPool();
  }

  async getSiteConfig() {
    const cacheKey = 'cache:config:site';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // 获取系统设置
    const [settings] = await this.pool.query<RowDataPacket[]>(
      "SELECT `key`, value_json FROM bb_setting WHERE `key` IN ('site', 'user', 'play', 'system', 'seo')"
    );
    const settingsMap: Record<string, any> = {};
    for (const row of settings) {
      try {
        settingsMap[row.key] = JSON.parse(row.value_json);
      } catch {
        settingsMap[row.key] = {};
      }
    }

    // 获取主题设置
    const [themeRows] = await this.pool.query<RowDataPacket[]>(
      "SELECT value_json FROM bb_theme_setting WHERE theme_id = 'mxpro' LIMIT 1"
    );
    let theme: any = {};
    if (themeRows.length > 0) {
      try {
        theme = JSON.parse(themeRows[0].value_json);
      } catch {
        theme = {};
      }
    }

    const site = settingsMap.site || {};
    const user = settingsMap.user || {};
    const play = settingsMap.play || {};
    const system = settingsMap.system || {};
    const seo = settingsMap.seo || {};

    const result = {
      // 网站基础信息
      siteName: site.siteName || system.siteName || '937 CMS',
      siteUrl: site.siteUrl || '',
      siteLogo: site.siteLogo || '',
      siteLogoDark: site.siteLogoDark || '',
      siteFavicon: site.siteFavicon || '',
      siteKeywords: site.siteKeywords || '',
      siteDescription: site.siteDescription || '',
      siteIcp: site.siteIcp || '',
      siteCopyright: site.siteCopyright || '',

      // 搜索配置
      searchHot: site.searchHot || '',
      searchPlaceholder: site.searchPlaceholder || '搜索影片...',

      // SEO（用于 Nuxt 动态 meta）
      seo: {
        homeTitle: seo.homeTitle || '',
        homeKeywords: seo.homeKeywords || '',
        homeDescription: seo.homeDescription || '',
        vodTitleTpl: seo.vodTitleTpl || '',
        vodKeywordsTpl: seo.vodKeywordsTpl || '',
        vodDescriptionTpl: seo.vodDescriptionTpl || '',
        playTitleTpl: seo.playTitleTpl || '',
        playKeywordsTpl: seo.playKeywordsTpl || '',
        playDescriptionTpl: seo.playDescriptionTpl || '',
        listTitleTpl: seo.listTitleTpl || '',
        listKeywordsTpl: seo.listKeywordsTpl || '',
        listDescriptionTpl: seo.listDescriptionTpl || '',
      },

      // 用户配置
      userStatus: user.status ?? 1,
      userRegStatus: user.regStatus ?? 1,
      userRegVerify: user.regVerify ?? 0,
      userLoginVerify: user.loginVerify ?? 0,

      // 播放配置
      playTrysee: play.trysee ?? 0,
      playPoints: play.points ?? 0,

      // 主题配置
      theme: {
        // 导航
        navTypeIds: theme.navTypeIds || '',
        navShowHome: theme.navShowHome ?? true,
        navShowGbook: theme.navShowGbook ?? true,
        navShowApp: theme.navShowApp ?? false,

        // 首页轮播
        slideStatus: theme.slideStatus ?? true,
        slideNum: theme.slideNum ?? 5,
        slideLevel: theme.slideLevel ?? 9,

        // 热门推荐
        hotStatus: theme.hotStatus ?? true,
        hotNum: theme.hotNum ?? 8,
        hotLevel: theme.hotLevel ?? 0,

        // 追剧周表
        weekStatus: theme.weekStatus ?? false,
        weekNum: theme.weekNum ?? 10,

        // 首页分类列表
        listTypeIds: theme.listTypeIds || '',
        listNum: theme.listNum ?? 14,

        // 排行榜
        topStatus: theme.topStatus ?? false,
        topTypeIds: theme.topTypeIds || '',
        topNum: theme.topNum ?? 10,

        // 友情链接
        linkStatus: theme.linkStatus ?? true,

        // 详情页
        likeStatus: theme.likeStatus ?? true,
        likeNum: theme.likeNum ?? 12,
        shareStatus: theme.shareStatus ?? true,
        reportStatus: theme.reportStatus ?? true,
        scoreStatus: theme.scoreStatus ?? true,
        commentStatus: theme.commentStatus ?? true,

        // 筛选
        filterClass: theme.filterClass ?? true,
        filterArea: theme.filterArea ?? true,
        filterLang: theme.filterLang ?? true,
        filterYear: theme.filterYear ?? true,
        filterLetter: theme.filterLetter ?? true,
        filterOrder: theme.filterOrder ?? true,

        // 公告
        noticeStatus: theme.noticeStatus ?? false,
        noticeContent: theme.noticeContent || '',
        noticeType: theme.noticeType ?? 1, // 1=弹窗 2=滚动
      },
    };

    const ttl = await this.cacheConfig.getModuleTtl('config');
    await this.cache.set(cacheKey, result, ttl);
    return result;
  }

  async getLinks() {
    const cacheKey = 'cache:config:links';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT id, name, url, logo FROM bb_link WHERE status = 1 ORDER BY sort DESC, id ASC'
    );
    const ttl = await this.cacheConfig.getModuleTtl('config');
    await this.cache.set(cacheKey, rows, ttl);
    return rows;
  }

  /**
   * 获取扩展分类
   */
  async getExtend() {
    const cacheKey = 'cache:config:extend';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [rows] = await this.pool.query<RowDataPacket[]>(
      "SELECT value_json FROM bb_setting WHERE `key` = 'extend' LIMIT 1"
    );
    const row = rows?.[0];
    let result = {};
    if (row) {
      try {
        const data = JSON.parse(row.value_json || '{}');
        result = {
          class: data.vodExtendClass ? data.vodExtendClass.split(',').filter(Boolean) : [],
          area: data.vodExtendArea ? data.vodExtendArea.split(',').filter(Boolean) : [],
          lang: data.vodExtendLang ? data.vodExtendLang.split(',').filter(Boolean) : [],
          year: data.vodExtendYear ? data.vodExtendYear.split(',').filter(Boolean) : [],
          version: data.vodExtendVersion ? data.vodExtendVersion.split(',').filter(Boolean) : [],
          state: data.vodExtendState ? data.vodExtendState.split(',').filter(Boolean) : [],
        };
      } catch {
        result = {};
      }
    }
    const ttl = await this.cacheConfig.getModuleTtl('config');
    await this.cache.set(cacheKey, result, ttl);
    return result;
  }
}
