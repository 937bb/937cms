import { BadRequestException, Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

/**
 * 播放器保存/更新的输入类型
 */
export type PlayerUpsert = {
  from_key: string;        // 播放器编码（必填）
  display_name?: string;   // 显示名称
  description?: string;    // 描述
  tip?: string;            // 提示信息
  parse_url?: string;      // 解析地址
  parse_mode?: number;     // 播放模式：0=直链，1=解析
  target?: string;         // 打开方式：_self/_blank
  player_code?: string;    // 播放器JS代码
  sort?: number;           // 排序值
  status?: number;         // 状态：0=禁用，1=启用
};

/**
 * 播放器导出数据格式
 */
export type PlayerExportData = {
  from_key: string;
  display_name: string;
  description: string;
  tip: string;
  parse_url: string;
  parse_mode: number;
  target: string;
  player_code: string;
  sort: number;
  status: number;
};

/**
 * 获取当前时间戳（秒）
 */
function nowTs() {
  return Math.floor(Date.now() / 1000);
}

/**
 * 字符串清理
 */
function trim(v: unknown) {
  return String(v ?? '').trim();
}

/**
 * 数值范围限制
 */
function clampInt(v: unknown, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

@Injectable()
export class AdminPlayerService {
  constructor(private readonly db: MySQLService) {}

  /**
   * 获取播放器列表
   * 按状态降序、排序值降序、ID升序排列
   */
  async list() {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      `SELECT from_key, display_name, description, tip, parse_url, parse_mode,
              target, player_code, sort, status, created_at, updated_at
       FROM bb_player
       ORDER BY status DESC, sort DESC, id ASC`,
    );
    return rows.map((r) => ({
      from_key: r.from_key,
      display_name: r.display_name,
      description: r.description,
      tip: r.tip,
      parse_url: r.parse_url,
      parse_mode: r.parse_mode,
      target: r.target,
      player_code: r.player_code,
      sort: r.sort,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  /**
   * 获取单个播放器详情
   */
  async get(fromKey: string) {
    const key = trim(fromKey);
    if (!key) throw new BadRequestException('from_key 不能为空');

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      `SELECT from_key, display_name, description, tip, parse_url, parse_mode,
              target, player_code, sort, status, created_at, updated_at
       FROM bb_player WHERE from_key = ? LIMIT 1`,
      [key],
    );
    if (!rows?.[0]) throw new BadRequestException('播放器不存在');
    return rows[0];
  }

  /**
   * 保存播放器（新增或更新）
   * 根据 from_key 判断是新增还是更新
   */
  async save(input: PlayerUpsert) {
    const fromKey = trim(input?.from_key);
    if (!fromKey) throw new BadRequestException('from_key 不能为空');
    if (fromKey.length > 64) throw new BadRequestException('from_key 长度不能超过64');

    // 验证 from_key 格式：只允许字母、数字、下划线
    if (!/^[a-zA-Z0-9_]+$/.test(fromKey)) {
      throw new BadRequestException('from_key 只能包含字母、数字、下划线');
    }

    const displayName = trim(input?.display_name) || fromKey;
    const description = trim(input?.description);
    const tip = trim(input?.tip);
    const parseMode = clampInt(input?.parse_mode, 0, 0, 1);
    const parseUrl = trim(input?.parse_url);
    const target = trim(input?.target) || '_self';
    const playerCode = trim(input?.player_code);
    const sort = clampInt(input?.sort, 0, 0, 1000000);
    const status = clampInt(input?.status, 1, 0, 1);
    const now = nowTs();

    // 解析模式下必须填写解析地址
    if (parseMode === 1 && !parseUrl) {
      throw new BadRequestException('解析模式下必须填写解析地址');
    }

    // 验证打开方式
    if (!['_self', '_blank'].includes(target)) {
      throw new BadRequestException('打开方式只能是 _self 或 _blank');
    }

    const pool = this.db.getPool();
    await pool.query(
      `INSERT INTO bb_player (from_key, display_name, description, tip, parse_url, parse_mode, target, player_code, sort, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         display_name=VALUES(display_name),
         description=VALUES(description),
         tip=VALUES(tip),
         parse_url=VALUES(parse_url),
         parse_mode=VALUES(parse_mode),
         target=VALUES(target),
         player_code=VALUES(player_code),
         sort=VALUES(sort),
         status=VALUES(status),
         updated_at=VALUES(updated_at)`,
      [fromKey, displayName, description, tip, parseUrl, parseMode, target, playerCode, sort, status, now, now],
    );
    return { ok: true };
  }

  /**
   * 删除播放器
   */
  async delete(fromKeyRaw: string) {
    const fromKey = trim(fromKeyRaw);
    if (!fromKey) throw new BadRequestException('from_key 不能为空');
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_player WHERE from_key = ?', [fromKey]);
    return { ok: true };
  }

  /**
   * 批量删除播放器
   */
  async batchDelete(fromKeys: string[]) {
    if (!Array.isArray(fromKeys) || fromKeys.length === 0) {
      throw new BadRequestException('请选择要删除的播放器');
    }
    const keys = fromKeys.map(trim).filter(Boolean);
    if (keys.length === 0) {
      throw new BadRequestException('请选择要删除的播放器');
    }

    const pool = this.db.getPool();
    const placeholders = keys.map(() => '?').join(',');
    await pool.query(`DELETE FROM bb_player WHERE from_key IN (${placeholders})`, keys);
    return { ok: true, deleted: keys.length };
  }

  /**
   * 批量修改字段
   * @param fromKeys 播放器编码数组
   * @param field 字段名（status/sort）
   * @param value 字段值
   */
  async batchUpdateField(fromKeys: string[], field: string, value: number) {
    if (!Array.isArray(fromKeys) || fromKeys.length === 0) {
      throw new BadRequestException('请选择要修改的播放器');
    }
    const keys = fromKeys.map(trim).filter(Boolean);
    if (keys.length === 0) {
      throw new BadRequestException('请选择要修改的播放器');
    }

    // 只允许修改特定字段
    const allowedFields = ['status', 'sort'];
    if (!allowedFields.includes(field)) {
      throw new BadRequestException('不支持修改该字段');
    }

    const pool = this.db.getPool();
    const placeholders = keys.map(() => '?').join(',');
    const now = nowTs();

    if (field === 'status') {
      const status = clampInt(value, 1, 0, 1);
      await pool.query(
        `UPDATE bb_player SET status = ?, updated_at = ? WHERE from_key IN (${placeholders})`,
        [status, now, ...keys],
      );
    } else if (field === 'sort') {
      const sort = clampInt(value, 0, 0, 1000000);
      await pool.query(
        `UPDATE bb_player SET sort = ?, updated_at = ? WHERE from_key IN (${placeholders})`,
        [sort, now, ...keys],
      );
    }

    return { ok: true, updated: keys.length };
  }

  /**
   * 导出单个播放器配置
   * 返回 Base64 编码的 JSON 数据
   */
  async exportPlayer(fromKey: string): Promise<string> {
    const player = await this.get(fromKey);
    const exportData: PlayerExportData = {
      from_key: player.from_key,
      display_name: player.display_name,
      description: player.description,
      tip: player.tip,
      parse_url: player.parse_url,
      parse_mode: player.parse_mode,
      target: player.target,
      player_code: player.player_code || '',
      sort: player.sort,
      status: player.status,
    };
    // 使用 Base64 编码，与 maccms 兼容
    return Buffer.from(JSON.stringify(exportData)).toString('base64');
  }

  /**
   * 导出所有播放器配置
   */
  async exportAll(): Promise<string> {
    const players = await this.list();
    const exportData = players.map((p) => ({
      from_key: p.from_key,
      display_name: p.display_name,
      description: p.description,
      tip: p.tip,
      parse_url: p.parse_url,
      parse_mode: p.parse_mode,
      target: p.target,
      player_code: p.player_code || '',
      sort: p.sort,
      status: p.status,
    }));
    return Buffer.from(JSON.stringify(exportData)).toString('base64');
  }

  /**
   * 导入播放器配置
   * @param inputData Base64 编码或原始 JSON 数据
   * @param overwrite 是否覆盖已存在的播放器
   * 兼容 maccms 格式：from/show/des/parse/ps/code
   */
  async importPlayer(inputData: string, overwrite = false) {
    if (!inputData) {
      throw new BadRequestException('导入数据不能为空');
    }

    let data: any | any[];
    const trimmed = inputData.trim();

    // 尝试直接解析 JSON（如果以 [ 或 { 开头）
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        data = JSON.parse(trimmed);
      } catch {
        throw new BadRequestException('导入数据格式错误');
      }
    } else {
      // 尝试 Base64 解码
      try {
        const jsonStr = Buffer.from(trimmed, 'base64').toString('utf-8');
        data = JSON.parse(jsonStr);
      } catch {
        throw new BadRequestException('导入数据格式错误');
      }
    }

    // 支持单个或批量导入
    const players = Array.isArray(data) ? data : [data];
    if (players.length === 0) {
      throw new BadRequestException('导入数据为空');
    }

    let imported = 0;
    let skipped = 0;

    for (const player of players) {
      // 兼容 maccms 格式：from -> from_key
      const fromKey = trim(player.from_key || player.from);
      if (!fromKey) {
        skipped++;
        continue;
      }

      // 检查是否已存在
      const pool = this.db.getPool();
      const [exists] = await pool.query<any[]>(
        'SELECT from_key FROM bb_player WHERE from_key = ? LIMIT 1',
        [fromKey],
      );

      if (exists?.[0] && !overwrite) {
        skipped++;
        continue;
      }

      // 保存播放器（兼容 maccms 字段名）
      await this.save({
        from_key: fromKey,
        display_name: trim(player.display_name || player.show),
        description: trim(player.description || player.des),
        tip: trim(player.tip),
        parse_url: trim(player.parse_url || player.parse),
        parse_mode: Number(player.parse_mode ?? player.ps ?? 0),
        target: trim(player.target) || '_self',
        player_code: trim(player.player_code || player.code),
        sort: Number(player.sort ?? 0),
        status: Number(player.status ?? 1),
      });
      imported++;
    }

    return { ok: true, imported, skipped };
  }

  /**
   * 获取启用的播放器列表（供前端使用）
   */
  async listEnabled() {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      `SELECT from_key, display_name, description, tip, parse_url, parse_mode, target, sort
       FROM bb_player
       WHERE status = 1
       ORDER BY sort DESC, id ASC`,
    );
    return rows;
  }
}
