import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

function clampInt(value: unknown, def: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return def;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function uniqIntsCsv(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  const out = raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.floor(n));
  return Array.from(new Set(out));
}

@Injectable()
export class PublicProvideService {
  constructor(private readonly db: MySQLService) {}

  async vod(query: Record<string, unknown>) {
    const ac = String(query.ac || query.action || 'detail').trim().toLowerCase();
    const page = clampInt(query.pg ?? query.page, 1, 1, 1_000_000);
    const limit = clampInt(query.limit ?? query.pageSize, 20, 1, 100);

    const typeId = query.t ? clampInt(query.t, 0, 0, 1_000_000) : 0;
    const ids = uniqIntsCsv(query.ids);
    const wd = String(query.wd || query.keyword || '').trim();
    const hours = query.h ? clampInt(query.h, 0, 0, 24 * 365) : 0;

    const where: string[] = ['v.vod_status = 1'];
    const params: any[] = [];
    if (typeId > 0) {
      where.push('(v.type_id = ? OR v.type_id_1 = ?)');
      params.push(typeId, typeId);
    }
    if (ids.length) {
      where.push(`v.vod_id IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    }
    if (wd) {
      where.push('v.vod_name LIKE ?');
      params.push(`%${wd}%`);
    }
    if (hours > 0) {
      const since = Math.floor(Date.now() / 1000) - hours * 3600;
      where.push('v.vod_time >= ?');
      params.push(since);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const pool = this.db.getPool();
    const [countRows] = await pool.query<any[]>(`SELECT COUNT(1) as c FROM bb_vod v ${whereSQL}`, params);
    const total = Number(countRows?.[0]?.c || 0);
    const pagecount = Math.max(1, Math.ceil(total / limit));

    const isDetail = ac === 'detail';
    const fields = isDetail
      ? `v.vod_id, v.type_id, t.type_name, v.vod_name, v.vod_sub, v.vod_en, v.vod_letter, v.vod_pic, v.vod_remarks,
         v.vod_actor, v.vod_director, v.vod_area, v.vod_lang, v.vod_year, v.vod_score, v.vod_score_num, v.vod_score_all,
         v.vod_hits, v.vod_time, v.vod_time_add, v.vod_content`
      : `v.vod_id, v.type_id, t.type_name, v.vod_name, v.vod_pic, v.vod_remarks, v.vod_year, v.vod_area, v.vod_lang, v.vod_time, v.vod_hits, v.vod_score`;

    const [rows] = await pool.query<any[]>(
      `SELECT ${fields}
       FROM bb_vod v
       LEFT JOIN bb_type t ON t.type_id = v.type_id
       ${whereSQL}
       ORDER BY v.vod_time DESC, v.vod_id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const list = (rows || []).map((r) => {
      if (!isDetail) {
        return {
          vod_id: r.vod_id,
          type_id: r.type_id,
          type_name: r.type_name || '',
          vod_name: r.vod_name,
          vod_pic: r.vod_pic,
          vod_remarks: r.vod_remarks,
          vod_year: r.vod_year,
          vod_area: r.vod_area,
          vod_lang: r.vod_lang,
          vod_time: r.vod_time,
          vod_hits: r.vod_hits,
          vod_score: r.vod_score,
        };
      }
      return {
        vod_id: r.vod_id,
        type_id: r.type_id,
        type_name: r.type_name || '',
        vod_name: r.vod_name,
        vod_sub: r.vod_sub || '',
        vod_en: r.vod_en || '',
        vod_letter: r.vod_letter || '',
        vod_pic: r.vod_pic,
        vod_remarks: r.vod_remarks,
        vod_actor: r.vod_actor,
        vod_director: r.vod_director,
        vod_area: r.vod_area,
        vod_lang: r.vod_lang,
        vod_year: r.vod_year,
        vod_score: r.vod_score,
        vod_score_num: r.vod_score_num,
        vod_score_all: r.vod_score_all,
        vod_hits: r.vod_hits,
        vod_time: r.vod_time,
        vod_time_add: r.vod_time_add,
        vod_content: r.vod_content,
      };
    });

    return {
      code: 1,
      msg: 'ok',
      page,
      pagecount,
      limit,
      total,
      list,
    };
  }

  async art(query: Record<string, unknown>) {
    const ac = String(query.ac || query.action || 'detail').trim().toLowerCase();
    const page = clampInt(query.pg ?? query.page, 1, 1, 1_000_000);
    const limit = clampInt(query.limit ?? query.pageSize, 20, 1, 100);

    const typeId = query.t ? clampInt(query.t, 0, 0, 1_000_000) : 0;
    const ids = uniqIntsCsv(query.ids);
    const wd = String(query.wd || query.keyword || '').trim();
    const hours = query.h ? clampInt(query.h, 0, 0, 24 * 365) : 0;

    const where: string[] = ['a.status = 1'];
    const params: any[] = [];
    if (typeId > 0) {
      where.push('(a.type_id = ? OR a.type_id_1 = ?)');
      params.push(typeId, typeId);
    }
    if (ids.length) {
      where.push(`a.id IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    }
    if (wd) {
      where.push('a.name LIKE ?');
      params.push(`%${wd}%`);
    }
    if (hours > 0) {
      const since = Math.floor(Date.now() / 1000) - hours * 3600;
      where.push('a.updated_at >= ?');
      params.push(since);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const pool = this.db.getPool();
    const [countRows] = await pool.query<any[]>(`SELECT COUNT(1) as c FROM bb_article a ${whereSQL}`, params);
    const total = Number(countRows?.[0]?.c || 0);
    const pagecount = Math.max(1, Math.ceil(total / limit));

    const isDetail = ac === 'detail';
    const fields = isDetail
      ? `a.id, a.type_id, t.type_name, a.name, a.sub, a.letter, a.pic, a.remarks, a.author, a.source, a.tag, a.blurb,
         a.hits, a.created_at, a.updated_at, a.content`
      : `a.id, a.type_id, t.type_name, a.name, a.pic, a.remarks, a.updated_at, a.hits`;

    const [rows] = await pool.query<any[]>(
      `SELECT ${fields}
       FROM bb_article a
       LEFT JOIN bb_type t ON t.type_id = a.type_id
       ${whereSQL}
       ORDER BY a.updated_at DESC, a.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const list = (rows || []).map((r) => {
      if (!isDetail) {
        return {
          art_id: r.id,
          type_id: r.type_id,
          type_name: r.type_name || '',
          art_name: r.name,
          art_pic: r.pic || '',
          art_remarks: r.remarks || '',
          art_time: r.updated_at || 0,
          art_hits: r.hits || 0,
        };
      }
      return {
        art_id: r.id,
        type_id: r.type_id,
        type_name: r.type_name || '',
        art_name: r.name,
        art_sub: r.sub || '',
        art_letter: r.letter || '',
        art_pic: r.pic || '',
        art_remarks: r.remarks || '',
        art_author: r.author || '',
        art_source: r.source || '',
        art_tag: r.tag || '',
        art_blurb: r.blurb || '',
        art_hits: r.hits || 0,
        art_time: r.updated_at || 0,
        art_time_add: r.created_at || 0,
        art_content: r.content || '',
      };
    });

    return {
      code: 1,
      msg: 'ok',
      page,
      pagecount,
      limit,
      total,
      list,
    };
  }
}
