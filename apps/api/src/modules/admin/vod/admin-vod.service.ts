import { BadRequestException, Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { VodQueryCacheService } from '../../../cache/vod-query-cache.service';

/**
 * 字符串清理
 */
function trim(v: unknown) {
  return String(v ?? '').trim();
}

/**
 * 获取当前时间戳（秒）
 */
function nowTs() {
  return Math.floor(Date.now() / 1000);
}

/**
 * 视频列表查询参数
 */
export type VodListInput = {
  page: number;
  pageSize: number;
  keyword?: string;      // 搜索关键词（名称/演员/副标题）
  typeId?: number;       // 分类ID
  status?: number;       // 状态：0=未审核，1=已审核
  level?: number;        // 推荐等级
  isend?: number;        // 完结状态：0=连载，1=完结
  lock?: number;         // 锁定状态：0=未锁定，1=已锁定
  copyright?: number;    // 版权：0=关闭，1=开启
  area?: string;         // 地区
  lang?: string;         // 语言
  year?: string;         // 年份
  pic?: string;          // 图片状态筛选
  url?: string;          // URL筛选（0=无地址，1=有地址）
  points?: string;       // 积分状态筛选
  plot?: number;         // 剧情状态筛选
  order?: string;        // 排序字段
  player?: string;       // 播放器筛选
};

export type VodSaveInput = Record<string, any>;

export type VodBatchFieldInput = {
  ids: number[];
  field: string;
  value?: any;
  start?: number;
  end?: number;
};

@Injectable()
export class AdminVodService {
  constructor(
    private readonly db: MySQLService,
    private readonly vodCache: VodQueryCacheService,
  ) {}

  /**
   * 获取视频列表
   * 支持多种筛选条件
   */
  async list(input: VodListInput) {
    const page = Math.max(1, Number(input.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(input.pageSize || 20)));
    const keyword = trim(input.keyword || '');
    const typeId = input.typeId ? Number(input.typeId) : 0;
    const status = input.status === undefined ? undefined : Number(input.status);
    const level = input.level === undefined ? undefined : Number(input.level);
    const isend = input.isend === undefined ? undefined : Number(input.isend);
    const lock = input.lock === undefined ? undefined : Number(input.lock);
    const copyright = input.copyright === undefined ? undefined : Number(input.copyright);
    const area = trim(input.area || '');
    const lang = trim(input.lang || '');
    const year = trim(input.year || '');
    const pic = trim(input.pic || '');
    const url = trim(input.url || '');
    const points = trim(input.points || '');
    const plot = input.plot === undefined ? undefined : Number(input.plot);
    const order = trim(input.order || '');

    const where: string[] = [];
    const params: any[] = [];

    // 关键词搜索（名称/演员/副标题）
    if (keyword) {
      where.push('(v.vod_name LIKE ? OR v.vod_actor LIKE ? OR v.vod_sub LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // 分类筛选（包含子分类）
    if (typeId) {
      where.push('(v.type_id = ? OR v.type_id_1 = ?)');
      params.push(typeId, typeId);
    }

    // 状态筛选
    if (status === 0 || status === 1) {
      where.push('v.vod_status = ?');
      params.push(status);
    }

    // 推荐等级筛选
    if (level !== undefined && level >= 0) {
      where.push('v.vod_level = ?');
      params.push(level);
    }

    // 完结状态筛选
    if (isend === 0 || isend === 1) {
      where.push('v.vod_isend = ?');
      params.push(isend);
    }

    // 锁定状态筛选
    if (lock === 0 || lock === 1) {
      where.push('v.vod_lock = ?');
      params.push(lock);
    }

    // 版权筛选
    if (copyright === 0 || copyright === 1) {
      where.push('v.vod_copyright = ?');
      params.push(copyright);
    }

    // 地区筛选
    if (area) {
      where.push('v.vod_area = ?');
      params.push(area);
    }

    // 语言筛选
    if (lang) {
      where.push('v.vod_lang = ?');
      params.push(lang);
    }

    // 年份筛选
    if (year) {
      where.push('v.vod_year = ?');
      params.push(year);
    }

    // 图片状态筛选
    if (pic === '1') {
      // 无图
      where.push("v.vod_pic = ''");
    } else if (pic === '2') {
      // 外链图
      where.push("v.vod_pic LIKE 'http%'");
    } else if (pic === '3') {
      // 错误图
      where.push("v.vod_pic LIKE '%#err%'");
    }

    // 播放地址状态筛选
    if (url === '0') {
      // 无地址：没有播放源
      where.push('NOT EXISTS (SELECT 1 FROM bb_vod_source s WHERE s.vod_id = v.vod_id)');
    } else if (url === '1') {
      // 有地址：有播放源
      where.push('EXISTS (SELECT 1 FROM bb_vod_source s WHERE s.vod_id = v.vod_id)');
    }

    // 积分状态筛选
    if (points === '1') {
      where.push('(v.vod_points > 0 OR v.vod_points_play > 0 OR v.vod_points_down > 0)');
    }

    // 剧情状态筛选
    if (plot === 1) {
      where.push('v.vod_plot = 1');
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // 排序
    let orderSQL = 'ORDER BY v.vod_time DESC';
    const allowedOrders = ['vod_id', 'vod_time', 'vod_time_add', 'vod_hits', 'vod_hits_day', 'vod_hits_week', 'vod_hits_month', 'vod_score'];
    if (order && allowedOrders.includes(order)) {
      orderSQL = `ORDER BY v.${order} DESC`;
    }

    const pool = this.db.getPool();

    // 查询总数
    const [countRows] = await pool.query<any[]>(`SELECT COUNT(*) as c FROM bb_vod v ${whereSQL}`, params);
    const total = Number(countRows?.[0]?.c || 0);

    // 查询列表
    const offset = (page - 1) * pageSize;
    const [items] = await pool.query<any[]>(
      `SELECT v.vod_id, v.vod_name, v.vod_sub, v.type_id, t.type_name, v.vod_pic, v.vod_remarks,
              v.vod_year, v.vod_area, v.vod_lang, v.vod_actor, v.vod_director,
              v.vod_time, v.vod_time_add, v.vod_status, v.vod_level, v.vod_isend, v.vod_lock,
              v.vod_copyright, v.vod_hits
       FROM bb_vod v
       LEFT JOIN bb_type t ON t.type_id = v.type_id
       ${whereSQL}
       ${orderSQL}
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    return { page, pageSize, total, items: items || [] };
  }

  /**
   * 获取视频详情
   */
  async get(id: number) {
    const vodId = Number(id);
    if (!vodId) throw new BadRequestException('vod_id 无效');

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SELECT * FROM bb_vod WHERE vod_id = ? LIMIT 1', [vodId]);
    const row = rows?.[0];
    if (!row) throw new BadRequestException('视频不存在');

    // 获取播放源（按播放器全局排序，再按视频源排序）
    const [sources] = await pool.query<any[]>(
      `SELECT s.id, s.player_id, s.player_name, s.sort
       FROM bb_vod_source s
       LEFT JOIN bb_player p ON p.id = s.player_id
       WHERE s.vod_id = ?
       ORDER BY COALESCE(p.sort, 0) DESC, s.sort DESC`,
      [vodId],
    );

    // 获取剧集（使用JOIN避免内存过滤）
    const [episodes] = await pool.query<any[]>(
      `SELECT e.id, e.source_id, e.episode_num, e.title, e.url, e.sort
       FROM bb_vod_episode e
       WHERE e.vod_id = ?
       ORDER BY e.source_id ASC, e.sort ASC`,
      [vodId],
    );

    // 组织播放源和剧集数据
    const playList = (sources || []).map((source: any) => ({
      id: source.id,
      playerId: source.player_id,
      playerName: source.player_name,
      episodes: (episodes || [])
        .filter((ep: any) => ep.source_id === source.id)
        .map((ep: any) => ({
          id: ep.id,
          num: ep.episode_num,
          title: ep.title,
          url: ep.url,
        })),
    }));

    return { item: row, playList };
  }

  /**
   * 保存视频（更新）
   */
  async save(input: VodSaveInput) {
    const vodId = Number(input.vod_id || 0);
    if (!vodId) throw new BadRequestException('vod_id 不能为空');

    const pool = this.db.getPool();

    // 检查视频是否存在
    const [exists] = await pool.query<any[]>('SELECT vod_id FROM bb_vod WHERE vod_id = ? LIMIT 1', [vodId]);
    if (!exists?.[0]) throw new BadRequestException('视频不存在');

    const fields: string[] = [];
    const params: any[] = [];

    // 分类
    if (input.type_id !== undefined) {
      const typeId = Number(input.type_id);
      if (typeId) {
        // 检查分类是否存在
        const [typeRows] = await pool.query<any[]>('SELECT type_id, type_pid FROM bb_type WHERE type_id = ? LIMIT 1', [typeId]);
        if (!typeRows?.[0]) throw new BadRequestException('分类不存在');
        fields.push('type_id = ?');
        params.push(typeId);
        // 设置父分类ID
        fields.push('type_id_1 = ?');
        params.push(typeRows[0].type_pid || 0);
      }
    }

    // 会员组（访问控制）
    if (input.group_id !== undefined) {
      fields.push('group_id = ?');
      params.push(Math.max(0, Number(input.group_id) || 0));
    }

    // 基本信息
    if (input.vod_name !== undefined) {
      const name = trim(input.vod_name);
      if (!name) throw new BadRequestException('视频名称不能为空');
      fields.push('vod_name = ?');
      params.push(name);
    }

    // 可选字段
    const optionalFields = [
      'vod_sub',
      'vod_en',
      'vod_letter',
      'vod_color',
      'vod_tag',
      'vod_class',
      'vod_pic',
      'vod_pic_thumb',
      'vod_pic_slide',
      'vod_pic_screenshot',
      'vod_actor',
      'vod_director',
      'vod_writer',
      'vod_behind',
      'vod_blurb',
      'vod_remarks',
      'vod_pubdate',
      'vod_serial',
      'vod_tv',
      'vod_weekday',
      'vod_area',
      'vod_lang',
      'vod_year',
      'vod_version',
      'vod_state',
      'vod_author',
      'vod_jumpurl',
      'vod_tpl',
      'vod_tpl_play',
      'vod_tpl_down',
      'vod_duration',
      'vod_reurl',
      'vod_rel_vod',
      'vod_rel_art',
      'vod_pwd',
      'vod_pwd_url',
      'vod_pwd_play',
      'vod_pwd_play_url',
      'vod_pwd_down',
      'vod_pwd_down_url',
      'vod_content',
      'vod_plot_name',
      'vod_plot_detail',
    ];
    for (const field of optionalFields) {
      if ((input as any)[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(trim((input as any)[field]));
      }
    }

    // 数值字段
    const numericFields = [
      'vod_status',
      'vod_level',
      'vod_isend',
      'vod_lock',
      'vod_copyright',
      'vod_points',
      'vod_points_play',
      'vod_points_down',
      'vod_hits',
      'vod_hits_day',
      'vod_hits_week',
      'vod_hits_month',
      'vod_up',
      'vod_down',
      'vod_score',
      'vod_score_all',
      'vod_score_num',
      'vod_trysee',
      'vod_douban_id',
      'vod_douban_score',
      'vod_total',
      'vod_plot',
    ];
    for (const field of numericFields) {
      if ((input as any)[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(Number((input as any)[field]) || 0);
      }
    }

    // 更新时间
    fields.push('vod_time = ?');
    params.push(nowTs());

    if (fields.length === 0) {
      throw new BadRequestException('没有要更新的字段');
    }

    params.push(vodId);
    await pool.query(`UPDATE bb_vod SET ${fields.join(', ')} WHERE vod_id = ?`, params);

    // 清除缓存
    await this.vodCache.invalidateVodCache(vodId).catch(() => void 0);

    return { ok: true };
  }

  /**
   * 删除单个视频
   */
  async delete(id: number) {
    const vodId = Number(id);
    if (!vodId) throw new BadRequestException('vod_id 无效');

    const pool = this.db.getPool();
    // 级联删除播放源和剧集
    await pool.query('DELETE FROM bb_vod_episode WHERE vod_id = ?', [vodId]);
    await pool.query('DELETE FROM bb_vod_source WHERE vod_id = ?', [vodId]);
    await pool.query('DELETE FROM bb_vod_download WHERE vod_id = ?', [vodId]);
    await pool.query('DELETE FROM bb_vod_download_source WHERE vod_id = ?', [vodId]);
    await pool.query('DELETE FROM bb_vod WHERE vod_id = ? LIMIT 1', [vodId]);

    // 清除缓存
    await this.vodCache.invalidateVodCache(vodId).catch(() => void 0);

    return { ok: true };
  }

  /**
   * 批量删除视频
   */
  async batchDelete(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('请选择要删除的视频');
    }
    const vodIds = ids.map(Number).filter(Boolean);
    if (vodIds.length === 0) {
      throw new BadRequestException('请选择要删除的视频');
    }

    const pool = this.db.getPool();
    const placeholders = vodIds.map(() => '?').join(',');
    // 级联删除播放源和剧集
    await pool.query(`DELETE FROM bb_vod_episode WHERE vod_id IN (${placeholders})`, vodIds);
    await pool.query(`DELETE FROM bb_vod_source WHERE vod_id IN (${placeholders})`, vodIds);
    await pool.query(`DELETE FROM bb_vod_download WHERE vod_id IN (${placeholders})`, vodIds);
    await pool.query(`DELETE FROM bb_vod_download_source WHERE vod_id IN (${placeholders})`, vodIds);
    await pool.query(`DELETE FROM bb_vod WHERE vod_id IN (${placeholders})`, vodIds);

    // 清除所有视频缓存
    await this.vodCache.invalidateAllVodCache().catch(() => void 0);

    return { ok: true, deleted: vodIds.length };
  }

  /**
   * 批量修改字段
   * 支持：状态、等级、锁定、版权、点击数、分类
   */
  async batchUpdateField(input: VodBatchFieldInput) {
    const { ids, field, value, start, end } = input;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('请选择要修改的视频');
    }
    const vodIds = ids.map(Number).filter(Boolean);
    if (vodIds.length === 0) {
      throw new BadRequestException('请选择要修改的视频');
    }

    // 允许修改的字段
    const allowedFields = ['vod_status', 'vod_lock', 'vod_level', 'vod_hits', 'type_id', 'vod_copyright', 'vod_isend'];
    if (!allowedFields.includes(field)) {
      throw new BadRequestException('不支持修改该字段');
    }

    const pool = this.db.getPool();
    const now = nowTs();

    // 随机点击数
    if (field === 'vod_hits' && start !== undefined && end !== undefined) {
      const now = nowTs();
      const updates: Array<{ id: number; hits: number }> = [];
      for (const vodId of vodIds) {
        const randomHits = Math.floor(Math.random() * (Number(end) - Number(start) + 1)) + Number(start);
        updates.push({ id: vodId, hits: randomHits });
      }

      // 使用CASE WHEN进行批量更新
      const caseWhen = updates.map((u) => `WHEN ${u.id} THEN ${u.hits}`).join(' ');
      const ids = updates.map((u) => u.id);
      const placeholders = ids.map(() => '?').join(',');
      await pool.query(
        `UPDATE bb_vod SET vod_hits = CASE vod_id ${caseWhen} END, vod_time = ? WHERE vod_id IN (${placeholders})`,
        [now, ...ids],
      );
      return { ok: true, updated: vodIds.length };
    }

    // 分类修改需要同时更新父分类
    if (field === 'type_id') {
      const typeId = Number(value);
      const [typeRows] = await pool.query<any[]>('SELECT type_id, type_pid FROM bb_type WHERE type_id = ? LIMIT 1', [typeId]);
      if (!typeRows?.[0]) throw new BadRequestException('分类不存在');

      const placeholders = vodIds.map(() => '?').join(',');
      await pool.query(
        `UPDATE bb_vod SET type_id = ?, type_id_1 = ?, vod_time = ? WHERE vod_id IN (${placeholders})`,
        [typeId, typeRows[0].type_pid || 0, now, ...vodIds],
      );
      return { ok: true, updated: vodIds.length };
    }

    // 普通字段修改
    const placeholders = vodIds.map(() => '?').join(',');
    await pool.query(
      `UPDATE bb_vod SET ${field} = ?, vod_time = ? WHERE vod_id IN (${placeholders})`,
      [Number(value), now, ...vodIds],
    );

    return { ok: true, updated: vodIds.length };
  }

  /**
   * 批量删除播放组
   * 删除指定播放器的播放数据
   */
  async batchDeletePlayGroup(ids: number[], player: string) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('请选择要操作的视频');
    }
    if (!player) {
      throw new BadRequestException('请选择要删除的播放器');
    }

    // Player deletion moved to bb_vod_source table management
    return { ok: true, updated: 0 };
  }

  /**
   * 获取筛选选项（地区、语言、年份等）
   */
  async getFilterOptions() {
    const pool = this.db.getPool();

    // 使用单个查询获取所有DISTINCT值，避免多次查询
    const [results] = await pool.query<any[]>(
      `SELECT
        'area' as type, vod_area as value FROM bb_vod WHERE vod_area != '' GROUP BY vod_area
       UNION ALL
       SELECT 'lang' as type, vod_lang as value FROM bb_vod WHERE vod_lang != '' GROUP BY vod_lang
       UNION ALL
       SELECT 'year' as type, vod_year as value FROM bb_vod WHERE vod_year != '' GROUP BY vod_year`,
    );

    const areas: string[] = [];
    const langs: string[] = [];
    const years: string[] = [];

    for (const row of results || []) {
      if (row.type === 'area') areas.push(row.value);
      else if (row.type === 'lang') langs.push(row.value);
      else if (row.type === 'year') years.push(row.value);
    }

    // 获取播放器列表
    const [playerRows] = await pool.query<any[]>(
      'SELECT from_key, display_name FROM bb_player WHERE status = 1 ORDER BY sort DESC',
    );
    const players = playerRows || [];

    return { areas, langs, years, players };
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    const pool = this.db.getPool();

    const [totalRows] = await pool.query<any[]>('SELECT COUNT(*) as c FROM bb_vod');
    const total = Number(totalRows?.[0]?.c || 0);

    const [todayRows] = await pool.query<any[]>(
      'SELECT COUNT(*) as c FROM bb_vod WHERE vod_time_add >= ?',
      [Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)],
    );
    const today = Number(todayRows?.[0]?.c || 0);

    const [pendingRows] = await pool.query<any[]>('SELECT COUNT(*) as c FROM bb_vod WHERE vod_status = 0');
    const pending = Number(pendingRows?.[0]?.c || 0);

    return { total, today, pending };
  }

  /**
   * 按筛选条件批量操作
   */
  async batchByFilter(filters: Partial<VodListInput>, action: string, value?: number, start?: number, end?: number) {
    const pool = this.db.getPool();
    const now = nowTs();

    // 构建筛选条件
    const where: string[] = [];
    const params: any[] = [];

    if (filters.typeId) { where.push('(type_id = ? OR type_id_1 = ?)'); params.push(filters.typeId, filters.typeId); }
    if (filters.status === 0 || filters.status === 1) { where.push('vod_status = ?'); params.push(filters.status); }
    if (filters.lock === 0 || filters.lock === 1) { where.push('vod_lock = ?'); params.push(filters.lock); }
    if (filters.level !== undefined && filters.level >= 0) { where.push('vod_level = ?'); params.push(filters.level); }
    if (filters.isend === 0 || filters.isend === 1) { where.push('vod_isend = ?'); params.push(filters.isend); }
    // url: '0' 表示无地址（没有播放源）
    if (filters.url === '0') { where.push('NOT EXISTS (SELECT 1 FROM bb_vod_source s WHERE s.vod_id = bb_vod.vod_id)'); }
    // url: '1' 表示有地址（有播放源）
    if (filters.url === '1') { where.push('EXISTS (SELECT 1 FROM bb_vod_source s WHERE s.vod_id = bb_vod.vod_id)'); }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // 获取符合条件的视频ID
    const [rows] = await pool.query<any[]>(`SELECT vod_id FROM bb_vod ${whereSQL}`, params);
    const vodIds = (rows || []).map((r) => Number(r.vod_id));
    if (vodIds.length === 0) return { ok: true, updated: 0 };

    const placeholders = vodIds.map(() => '?').join(',');

    if (action === 'delete') {
      // 级联删除播放源和剧集
      await pool.query(`DELETE FROM bb_vod_episode WHERE vod_id IN (${placeholders})`, vodIds);
      await pool.query(`DELETE FROM bb_vod_source WHERE vod_id IN (${placeholders})`, vodIds);
      await pool.query(`DELETE FROM bb_vod_download WHERE vod_id IN (${placeholders})`, vodIds);
      await pool.query(`DELETE FROM bb_vod_download_source WHERE vod_id IN (${placeholders})`, vodIds);
      await pool.query(`DELETE FROM bb_vod WHERE vod_id IN (${placeholders})`, vodIds);
      return { ok: true, updated: vodIds.length };
    }

    if (action === 'status') {
      await pool.query(`UPDATE bb_vod SET vod_status = ?, vod_time = ? WHERE vod_id IN (${placeholders})`, [value ?? 0, now, ...vodIds]);
      return { ok: true, updated: vodIds.length };
    }

    if (action === 'lock') {
      await pool.query(`UPDATE bb_vod SET vod_lock = ?, vod_time = ? WHERE vod_id IN (${placeholders})`, [value ?? 0, now, ...vodIds]);
      return { ok: true, updated: vodIds.length };
    }

    if (action === 'level') {
      await pool.query(`UPDATE bb_vod SET vod_level = ?, vod_time = ? WHERE vod_id IN (${placeholders})`, [value ?? 0, now, ...vodIds]);
      return { ok: true, updated: vodIds.length };
    }

    if (action === 'type') {
      const typeId = Number(value);
      const [typeRows] = await pool.query<any[]>('SELECT type_id, type_pid FROM bb_type WHERE type_id = ? LIMIT 1', [typeId]);
      if (!typeRows?.[0]) throw new BadRequestException('分类不存在');
      await pool.query(`UPDATE bb_vod SET type_id = ?, type_id_1 = ?, vod_time = ? WHERE vod_id IN (${placeholders})`, [typeId, typeRows[0].type_pid || 0, now, ...vodIds]);
      return { ok: true, updated: vodIds.length };
    }

    if (action === 'hits') {
      const updates: Array<{ id: number; hits: number }> = [];
      for (const vodId of vodIds) {
        const randomHits = Math.floor(Math.random() * (Number(end) - Number(start) + 1)) + Number(start);
        updates.push({ id: vodId, hits: randomHits });
      }

      // 使用CASE WHEN进行批量更新
      const caseWhen = updates.map((u) => `WHEN ${u.id} THEN ${u.hits}`).join(' ');
      const ids = updates.map((u) => u.id);
      const placeholders = ids.map(() => '?').join(',');
      await pool.query(
        `UPDATE bb_vod SET vod_hits = CASE vod_id ${caseWhen} END, vod_time = ? WHERE vod_id IN (${placeholders})`,
        [now, ...ids],
      );
      return { ok: true, updated: vodIds.length };
    }

    throw new BadRequestException('不支持的操作类型');
  }

  /**
   * 获取重名视频
   */
  async getDuplicates(page: number, pageSize: number) {
    page = Math.max(1, page);
    pageSize = Math.min(100, Math.max(1, pageSize));
    const pool = this.db.getPool();

    // 查找重名的视频名称
    const [countRows] = await pool.query<any[]>('SELECT COUNT(DISTINCT vod_name) as c FROM bb_vod WHERE vod_name IN (SELECT vod_name FROM bb_vod GROUP BY vod_name HAVING COUNT(*) > 1)');
    const total = Number(countRows?.[0]?.c || 0);

    const offset = (page - 1) * pageSize;
    const [nameRows] = await pool.query<any[]>('SELECT vod_name, COUNT(*) as cnt FROM bb_vod GROUP BY vod_name HAVING COUNT(*) > 1 ORDER BY cnt DESC LIMIT ? OFFSET ?', [pageSize, offset]);

    if (!nameRows || nameRows.length === 0) {
      return { page, pageSize, total, items: [] };
    }

    // 一次性获取所有重名视频，避免N+1查询
    const names = (nameRows || []).map((r) => r.vod_name);
    const placeholders = names.map(() => '?').join(',');
    const [allVideos] = await pool.query<any[]>(
      `SELECT vod_id, vod_name, type_id, vod_time, vod_status FROM bb_vod WHERE vod_name IN (${placeholders}) ORDER BY vod_name, vod_id`,
      names,
    );

    // 按名称分组
    const videosByName = new Map<string, any[]>();
    for (const video of allVideos || []) {
      if (!videosByName.has(video.vod_name)) {
        videosByName.set(video.vod_name, []);
      }
      videosByName.get(video.vod_name)!.push(video);
    }

    const items: { name: string; count: number; videos: any[] }[] = [];
    for (const row of nameRows || []) {
      items.push({ name: row.vod_name, count: Number(row.cnt), videos: videosByName.get(row.vod_name) || [] });
    }

    return { page, pageSize, total, items };
  }

  /**
   * 更新单个剧集
   */
  async updateEpisode(vodId: number, epId: number, body: any) {
    const pool = this.db.getPool();
    await (pool as any).query(
      'UPDATE bb_vod_episode SET episode_num = ?, title = ?, url = ? WHERE id = ? AND vod_id = ?',
      [body.episode_num, body.title, body.url, epId, vodId],
    );
    return { ok: true, message: '更新成功' };
  }

  /**
   * 创建新剧集
   */
  async createEpisode(vodId: number, body: any) {
    const pool = this.db.getPool();
    const [res] = await (pool as any).query(
      'INSERT INTO bb_vod_episode (vod_id, source_id, episode_num, title, url, sort) VALUES (?, ?, ?, ?, ?, ?)',
      [vodId, body.source_id, body.episode_num, body.title, body.url, 0],
    );
    return { ok: true, message: '创建成功', id: (res as any).insertId };
  }
}
