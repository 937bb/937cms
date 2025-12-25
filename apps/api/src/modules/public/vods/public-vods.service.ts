import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { PublicMemberGroupService } from '../member-group/public-member-group.service';
import { VodQueryCacheService } from '../../../cache/vod-query-cache.service';
import { SearchCacheService } from '../../../cache/search-cache.service';

function clampInt(value: unknown, def: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return def;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function parseLevelFilter(value: unknown): { mode: 'none' } | { mode: 'gte'; v: number } | { mode: 'in'; v: number[] } {
  if (value === undefined || value === null) return { mode: 'none' };
  const raw = String(value).trim();
  if (!raw) return { mode: 'none' };
  if (raw.includes(',')) {
    const levels = raw
      .split(',')
      .map((s) => clampInt(s.trim(), -1, 0, 9))
      .filter((n) => n >= 0);
    const uniq = Array.from(new Set(levels));
    // 0 in mxpro means "no restriction"
    if (uniq.includes(0)) return { mode: 'none' };
    return uniq.length ? { mode: 'in', v: uniq } : { mode: 'none' };
  }
  const single = clampInt(raw, -1, 0, 9);
  if (single < 0) return { mode: 'none' };
  // Keep legacy behavior: single value means ">= level"
  return { mode: 'gte', v: single };
}


@Injectable()
export class PublicVodsService {
  constructor(
    private readonly db: MySQLService,
    private readonly memberGroup: PublicMemberGroupService,
    private readonly vodCache: VodQueryCacheService,
    private readonly searchCache: SearchCacheService,
  ) {}

  async hit(id: number) {
    const pool = this.db.getPool();
    const now = Math.floor(Date.now() / 1000);

    await pool.query(
      `UPDATE bb_vod
       SET vod_hits = IFNULL(vod_hits, 0) + 1,
           vod_hits_day = CASE
             WHEN FROM_UNIXTIME(IFNULL(vod_time_hits, 0), '%Y-%m-%d') = FROM_UNIXTIME(?, '%Y-%m-%d')
               THEN IFNULL(vod_hits_day, 0) + 1
             ELSE 1
           END,
           vod_hits_week = CASE
             WHEN YEARWEEK(FROM_UNIXTIME(IFNULL(vod_time_hits, 0)), 1) = YEARWEEK(FROM_UNIXTIME(?), 1)
               THEN IFNULL(vod_hits_week, 0) + 1
             ELSE 1
           END,
           vod_hits_month = CASE
             WHEN DATE_FORMAT(FROM_UNIXTIME(IFNULL(vod_time_hits, 0)), '%Y-%m') = DATE_FORMAT(FROM_UNIXTIME(?), '%Y-%m')
               THEN IFNULL(vod_hits_month, 0) + 1
             ELSE 1
           END,
           vod_time_hits = ?
       WHERE vod_id = ?`,
      [now, now, now, now, id],
    );

    return { ok: true };
  }

  async list(query: Record<string, unknown>, groupId = 1) {
    return this.searchCache.searchVods(query, groupId, async () => {
      const page = clampInt(query.page, 1, 1, 1000000);
      const pageSize = clampInt(query.pageSize, 24, 1, 100);
      const typeId = query.typeId ? clampInt(query.typeId, 0, 0, 1000000) : 0;
      const typeId1 = query.typeId1 ? clampInt(query.typeId1, 0, 0, 1000000) : 0;
      const year = String(query.year || '').trim();
      const area = String(query.area || '').trim();
      const lang = String(query.lang || '').trim();
      const classTag = String(query.class || '').trim();
      const letter = String(query.letter || '').trim().toUpperCase();
      const level = parseLevelFilter(query.level);
      const keyword = String(query.keyword || '').trim();

      const by = String(query.sort || 'time');
      const order = String(query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      const allowedSort = new Set(['time', 'hits', 'hits_day', 'hits_week', 'hits_month', 'score', 'id']);
      const sortKey = allowedSort.has(by) ? by : 'time';
      const sortColumn = {
        time: 'vod_time',
        hits: 'vod_hits',
        hits_day: 'vod_hits_day',
        hits_week: 'vod_hits_week',
        hits_month: 'vod_hits_month',
        score: 'vod_score',
        id: 'vod_id',
      }[sortKey];

      const perm = await this.memberGroup.getPermission(groupId);
      const allowedTypeIds: number[] = [];
      for (const [tid, p] of perm.popedom) {
        if (p.list) allowedTypeIds.push(tid);
      }

      if (allowedTypeIds.length === 0) {
        return { page, pageSize, total: 0, list: [] };
      }

      const where: string[] = ['vod_status = 1'];
      const params: any[] = [];

      const placeholders = allowedTypeIds.map(() => '?').join(',');
      where.push(`(type_id IN (${placeholders}) OR type_id_1 IN (${placeholders}))`);
      params.push(...allowedTypeIds, ...allowedTypeIds);

      where.push('(vod_level = 0 OR vod_level <= ?)');
      params.push(perm.level);

      if (typeId > 0) {
        where.push('(type_id = ? OR type_id_1 = ?)');
        params.push(typeId, typeId);
      }
      if (typeId1 > 0) {
        where.push('type_id_1 = ?');
        params.push(typeId1);
      }
      if (year) {
        where.push('vod_year = ?');
        params.push(year);
      }
      if (area) {
        where.push('vod_area = ?');
        params.push(area);
      }
      if (lang) {
        where.push('vod_lang = ?');
        params.push(lang);
      }
      if (classTag) {
        where.push('vod_class LIKE ?');
        params.push(`%${classTag}%`);
      }
      if (letter) {
        where.push('vod_letter = ?');
        params.push(letter);
      }
      if (level.mode === 'gte') {
        where.push('vod_level >= ?');
        params.push(level.v);
      } else if (level.mode === 'in') {
        where.push(`vod_level IN (${level.v.map(() => '?').join(',')})`);
        params.push(...level.v);
      }
      if (keyword) {
        where.push('vod_name LIKE ?');
        params.push(`%${keyword}%`);
      }

      const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const offset = (page - 1) * pageSize;
      const pool = this.db.getPool();

      const [countRows] = await pool.query<any[]>(`SELECT COUNT(1) as c FROM bb_vod ${whereSQL}`, params);
      const total = Number(countRows?.[0]?.c || 0);

      const [rows] = await pool.query<any[]>(
        `SELECT vod_id, type_id, vod_name, vod_pic, vod_pic_slide, vod_remarks, vod_year, vod_area, vod_lang, vod_class, vod_actor, vod_time, vod_hits, vod_score
         FROM bb_vod
         ${whereSQL}
         ORDER BY ${sortColumn} ${order}
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      );

      return {
        page,
        pageSize,
        total,
        list: rows.map((r) => ({
          id: r.vod_id,
          typeId: r.type_id,
          name: r.vod_name,
          pic: r.vod_pic,
          picSlide: r.vod_pic_slide,
          remarks: r.vod_remarks,
          year: r.vod_year,
          area: r.vod_area,
          lang: r.vod_lang,
          class: r.vod_class,
          actor: r.vod_actor,
          time: r.vod_time,
          hits: r.vod_hits,
          score: r.vod_score,
        })),
      };
    });
  }

  async detail(id: number, groupId = 1) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      `SELECT vod_id, type_id, type_id_1, vod_name, vod_sub, vod_en, vod_letter, vod_pic, vod_remarks, vod_blurb, vod_actor, vod_director,
              vod_area, vod_lang, vod_year, vod_score, vod_score_num, vod_score_all, vod_hits, vod_time, vod_time_add, vod_content,
              vod_level
       FROM bb_vod WHERE vod_id = ? AND vod_status = 1 LIMIT 1`,
      [id],
    );
    const row = rows?.[0];
    if (!row) return null;

    // 权限检查
    const perm = await this.memberGroup.getPermission(groupId);
    if (!this.memberGroup.canAccessPage(perm, row.type_id, 'detail')) {
      return { error: 'no_permission', message: '您的会员组无权访问此分类' };
    }
    if (!this.memberGroup.canAccessLevel(perm, row.vod_level || 0)) {
      return { error: 'level_required', message: '需要更高等级会员组才能观看', requiredLevel: row.vod_level };
    }

    // 从规范化表读取剧集数据
    const playList = await this.getPlayListFromNormalized(id);

    return {
      id: row.vod_id,
      typeId: row.type_id,
      typeId1: row.type_id_1,
      name: row.vod_name,
      sub: row.vod_sub,
      en: row.vod_en,
      letter: row.vod_letter,
      pic: row.vod_pic,
      remarks: row.vod_remarks,
      blurb: row.vod_blurb,
      actor: row.vod_actor,
      director: row.vod_director,
      area: row.vod_area,
      lang: row.vod_lang,
      year: row.vod_year,
      score: row.vod_score,
      scoreNum: row.vod_score_num,
      scoreAll: row.vod_score_all,
      hits: row.vod_hits,
      time: row.vod_time,
      timeAdd: row.vod_time_add,
      content: row.vod_content,
      playList: playList,
    };
  }

  // 从规范化表读取播放列表（单次 JOIN 查询优化）
  private async getPlayListFromNormalized(vodId: number) {
    const rows = await this.vodCache.getVodSourcesWithEpisodes(vodId);

    if (!rows?.length) return [];

    // 按播放源分组
    const sourceMap = new Map<number, { from: string; urls: Array<{ name: string; url: string }> }>();
    for (const row of rows) {
      if (!sourceMap.has(row.source_id)) {
        sourceMap.set(row.source_id, { from: row.player_name, urls: [] });
      }
      if (row.url) {
        sourceMap.get(row.source_id)!.urls.push({ name: row.title || '播放', url: row.url });
      }
    }

    return Array.from(sourceMap.values());
  }
}
