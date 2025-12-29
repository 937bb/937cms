import { BadRequestException, Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { SystemSettingsService } from '../system/system-settings.service';

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
 * 分类保存参数
 */
export type TypeSaveInput = {
  type_id?: number;
  type_name: string;
  type_en?: string;
  type_sort?: number;
  type_mid?: number;
  type_pid?: number;
  type_status?: number;
  type_tpl?: string;
  type_tpl_list?: string;
  type_tpl_detail?: string;
  type_tpl_play?: string;
  type_tpl_down?: string;
  type_key?: string;
  type_des?: string;
  type_title?: string;
  type_extend?: string;
  type_logo?: string;
  type_pic?: string;
};

/**
 * 批量保存参数
 */
export type TypeBatchSaveItem = {
  type_id: number;
  type_name?: string;
  type_en?: string;
  type_sort?: number;
  type_tpl?: string;
  type_tpl_list?: string;
  type_tpl_detail?: string;
};

@Injectable()
export class AdminTypeService {
  constructor(
    private readonly db: MySQLService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  /**
   * 获取分类列表
   * 返回树形结构，包含各分类下的内容数量
   */
  async list() {
    const pool = this.db.getPool();

    // 获取所有分类
    const [rows] = await pool.query<any[]>(
      `SELECT type_id, type_name, type_en, type_sort, type_mid, type_pid, type_status,
              type_tpl, type_tpl_list, type_tpl_detail, type_tpl_play, type_tpl_down,
              type_key, type_des, type_title, type_extend, type_logo, type_pic
       FROM bb_type
       WHERE type_mid = 1
       ORDER BY type_sort ASC, type_id ASC`,
    );

    // 获取各分类下的视频数量
    const [vodCounts] = await pool.query<any[]>(
      `SELECT type_id, type_id_1, COUNT(vod_id) as count
       FROM bb_vod
       GROUP BY type_id, type_id_1`,
    );

    // 统计数量
    const countMap = new Map<number, number>();
    for (const row of vodCounts || []) {
      const typeId = Number(row.type_id);
      const typeId1 = Number(row.type_id_1);
      const count = Number(row.count);

      // 子分类数量
      countMap.set(typeId, (countMap.get(typeId) || 0) + count);
      // 父分类数量
      if (typeId1) {
        countMap.set(typeId1, (countMap.get(typeId1) || 0) + count);
      }
    }

    // 构建树形结构
    const items = (rows || []).map((r) => ({
      ...r,
      vod_count: countMap.get(r.type_id) || 0,
    }));

    // 分离父分类和子分类
    const parents = items.filter((r) => !r.type_pid);
    const children = items.filter((r) => r.type_pid);

    // 组装树形结构
    const tree = parents.map((p) => ({
      ...p,
      children: children.filter((c) => c.type_pid === p.type_id),
    }));

    return { items: tree };
  }

  /**
   * 获取分类详情
   */
  async get(typeId: number) {
    const id = Number(typeId);
    if (!id) throw new BadRequestException('type_id 无效');

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM bb_type WHERE type_id = ? LIMIT 1',
      [id],
    );
    if (!rows?.[0]) throw new BadRequestException('分类不存在');

    return { item: rows[0] };
  }

  /**
   * 保存分类（新增或更新）
   */
  async save(input: TypeSaveInput) {
    const pool = this.db.getPool();
    const typeId = Number(input.type_id || 0);
    const name = trim(input.type_name);
    const en = trim(input.type_en || '');
    const pid = Number(input.type_pid || 0);
    const sort = Number(input.type_sort || 0);
    const mid = Number(input.type_mid || 1);
    const status = input.type_status === undefined ? 1 : (Number(input.type_status) ? 1 : 0);

    if (name.length < 1) throw new BadRequestException('分类名称不能为空');
    if (pid < 0) throw new BadRequestException('父分类ID无效');

    // 验证父分类是否存在
    if (pid > 0) {
      const [parentRows] = await pool.query<any[]>(
        'SELECT type_id, type_pid FROM bb_type WHERE type_id = ? LIMIT 1',
        [pid],
      );
      if (!parentRows?.[0]) throw new BadRequestException('父分类不存在');
      // 不允许选择子分类作为父分类
      if (parentRows[0].type_pid > 0) {
        throw new BadRequestException('不能选择子分类作为父分类');
      }
    }

    // 可选字段
    const tpl = trim(input.type_tpl || '');
    const tplList = trim(input.type_tpl_list || '');
    const tplDetail = trim(input.type_tpl_detail || '');
    const tplPlay = trim(input.type_tpl_play || '');
    const tplDown = trim(input.type_tpl_down || '');
    const key = trim(input.type_key || '');
    const des = trim(input.type_des || '');
    const title = trim(input.type_title || '');
    const extend = trim(input.type_extend || '');
    const logo = trim(input.type_logo || '');
    const pic = trim(input.type_pic || '');

    if (!typeId) {
      // 新增
      const [res] = await pool.query<any>(
        `INSERT INTO bb_type (type_name, type_en, type_sort, type_mid, type_pid, type_status,
                              type_tpl, type_tpl_list, type_tpl_detail, type_tpl_play, type_tpl_down,
                              type_key, type_des, type_title, type_extend, type_logo, type_pic)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [name, en, sort, mid, pid, status, tpl, tplList, tplDetail, tplPlay, tplDown, key, des, title, extend, logo, pic],
      );
      return { ok: true, type_id: res.insertId };
    }

    // 更新
    const [exists] = await pool.query<any[]>('SELECT type_id FROM bb_type WHERE type_id = ? LIMIT 1', [typeId]);
    if (!exists?.[0]) throw new BadRequestException('分类不存在');

    // 不能将自己设为父分类
    if (pid === typeId) {
      throw new BadRequestException('不能将自己设为父分类');
    }

    await pool.query(
      `UPDATE bb_type
       SET type_name = ?, type_en = ?, type_sort = ?, type_pid = ?, type_status = ?,
           type_tpl = ?, type_tpl_list = ?, type_tpl_detail = ?, type_tpl_play = ?, type_tpl_down = ?,
           type_key = ?, type_des = ?, type_title = ?, type_extend = ?, type_logo = ?, type_pic = ?
       WHERE type_id = ?`,
      [name, en, sort, pid, status, tpl, tplList, tplDetail, tplPlay, tplDown, key, des, title, extend, logo, pic, typeId],
    );
    return { ok: true };
  }

  /**
   * 批量保存分类
   * 用于快速编辑列表中的分类信息
   */
  async batchSave(items: TypeBatchSaveItem[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('没有要保存的数据');
    }

    const pool = this.db.getPool();

    for (const item of items) {
      const typeId = Number(item.type_id);
      if (!typeId) continue;

      const fields: string[] = [];
      const params: any[] = [];

      if (item.type_name !== undefined) {
        const name = trim(item.type_name);
        if (!name) continue; // 跳过空名称
        fields.push('type_name = ?');
        params.push(name);
      }
      if (item.type_en !== undefined) {
        fields.push('type_en = ?');
        params.push(trim(item.type_en));
      }
      if (item.type_sort !== undefined) {
        fields.push('type_sort = ?');
        params.push(Number(item.type_sort) || 0);
      }
      if (item.type_tpl !== undefined) {
        fields.push('type_tpl = ?');
        params.push(trim(item.type_tpl));
      }
      if (item.type_tpl_list !== undefined) {
        fields.push('type_tpl_list = ?');
        params.push(trim(item.type_tpl_list));
      }
      if (item.type_tpl_detail !== undefined) {
        fields.push('type_tpl_detail = ?');
        params.push(trim(item.type_tpl_detail));
      }

      if (fields.length === 0) continue;

      params.push(typeId);
      await pool.query(`UPDATE bb_type SET ${fields.join(', ')} WHERE type_id = ?`, params);
    }

    return { ok: true };
  }

  /**
   * 删除分类
   */
  async delete(typeId: number) {
    const id = Number(typeId);
    if (!id) throw new BadRequestException('type_id 无效');

    const pool = this.db.getPool();

    // 检查是否有子分类
    const [children] = await pool.query<any[]>('SELECT type_id FROM bb_type WHERE type_pid = ? LIMIT 1', [id]);
    if (children?.[0]) throw new BadRequestException('该分类下有子分类，无法删除');

    // 检查是否有视频
    const [vod] = await pool.query<any[]>('SELECT vod_id FROM bb_vod WHERE type_id = ? LIMIT 1', [id]);
    if (vod?.[0]) throw new BadRequestException('该分类下有视频，无法删除');

    await pool.query('DELETE FROM bb_type WHERE type_id = ? LIMIT 1', [id]);
    return { ok: true };
  }

  /**
   * 批量修改字段
   */
  async batchUpdateField(ids: number[], field: string, value: number) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('请选择要修改的分类');
    }
    const typeIds = ids.map(Number).filter(Boolean);
    if (typeIds.length === 0) {
      throw new BadRequestException('请选择要修改的分类');
    }

    // 只允许修改状态
    if (field !== 'type_status') {
      throw new BadRequestException('不支持修改该字段');
    }

    const pool = this.db.getPool();
    const placeholders = typeIds.map(() => '?').join(',');
    const status = Number(value) ? 1 : 0;

    await pool.query(
      `UPDATE bb_type SET type_status = ? WHERE type_id IN (${placeholders})`,
      [status, ...typeIds],
    );

    return { ok: true, updated: typeIds.length };
  }

  /**
   * 移动分类
   * 将分类移动到另一个父分类下
   */
  async move(ids: number[], targetPid: number) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('请选择要移动的分类');
    }
    const typeIds = ids.map(Number).filter(Boolean);
    const pid = Number(targetPid);

    const pool = this.db.getPool();

    // 验证目标父分类
    if (pid > 0) {
      const [parentRows] = await pool.query<any[]>(
        'SELECT type_id, type_pid FROM bb_type WHERE type_id = ? LIMIT 1',
        [pid],
      );
      if (!parentRows?.[0]) throw new BadRequestException('目标分类不存在');
      if (parentRows[0].type_pid > 0) {
        throw new BadRequestException('不能移动到子分类下');
      }
    }

    // 不能移动到自己下面
    if (typeIds.includes(pid)) {
      throw new BadRequestException('不能移动到自己下面');
    }

    const placeholders = typeIds.map(() => '?').join(',');
    await pool.query(
      `UPDATE bb_type SET type_pid = ? WHERE type_id IN (${placeholders})`,
      [pid, ...typeIds],
    );

    return { ok: true, moved: typeIds.length };
  }

  /**
   * 获取扩展配置
   * 返回分类的扩展筛选选项（地区、语言、年份等）
   * 优先级：分类配置 > 父分类配置 > 全局系统配置
   */
  async getExtend(typeId: number) {
    const id = Number(typeId);
    if (!id) throw new BadRequestException('type_id 无效');

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT type_id, type_pid, type_mid, type_extend FROM bb_type WHERE type_id = ? LIMIT 1',
      [id],
    );
    if (!rows?.[0]) throw new BadRequestException('分类不存在');

    const typeInfo = rows[0];
    let extend: Record<string, string[]> = {};

    // 解析扩展配置
    try {
      const extendStr = typeInfo.type_extend || '';
      if (extendStr) {
        const extendObj = JSON.parse(extendStr);
        for (const key of Object.keys(extendObj)) {
          const value = String(extendObj[key] || '');
          extend[key] = value.split(',').filter(Boolean);
        }
      }
    } catch {
      // 忽略解析错误
    }

    // 如果没有配置，尝试从父分类获取
    if (Object.keys(extend).length === 0 && typeInfo.type_pid > 0) {
      const [parentRows] = await pool.query<any[]>(
        'SELECT type_extend FROM bb_type WHERE type_id = ? LIMIT 1',
        [typeInfo.type_pid],
      );
      if (parentRows?.[0]?.type_extend) {
        try {
          const extendObj = JSON.parse(parentRows[0].type_extend);
          for (const key of Object.keys(extendObj)) {
            const value = String(extendObj[key] || '');
            extend[key] = value.split(',').filter(Boolean);
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    // 如果仍然没有配置，从全局系统配置获取
    if (Object.keys(extend).length === 0) {
      const globalExtend = await this.systemSettings.getExtend();
      if (globalExtend.vodExtendClass) {
        extend.class = globalExtend.vodExtendClass.split(',').filter(Boolean);
      }
      if (globalExtend.vodExtendArea) {
        extend.area = globalExtend.vodExtendArea.split(',').filter(Boolean);
      }
      if (globalExtend.vodExtendLang) {
        extend.lang = globalExtend.vodExtendLang.split(',').filter(Boolean);
      }
      if (globalExtend.vodExtendYear) {
        extend.year = globalExtend.vodExtendYear.split(',').filter(Boolean);
      }
      if (globalExtend.vodExtendVersion) {
        extend.version = globalExtend.vodExtendVersion.split(',').filter(Boolean);
      }
      if (globalExtend.vodExtendState) {
        extend.state = globalExtend.vodExtendState.split(',').filter(Boolean);
      }
    }

    return { extend };
  }

  /**
   * 保存扩展配置
   */
  async saveExtend(typeId: number, extend: Record<string, string>) {
    const id = Number(typeId);
    if (!id) throw new BadRequestException('type_id 无效');

    const pool = this.db.getPool();
    const [exists] = await pool.query<any[]>('SELECT type_id FROM bb_type WHERE type_id = ? LIMIT 1', [id]);
    if (!exists?.[0]) throw new BadRequestException('分类不存在');

    const extendStr = JSON.stringify(extend || {});
    await pool.query('UPDATE bb_type SET type_extend = ? WHERE type_id = ?', [extendStr, id]);

    return { ok: true };
  }

  /**
   * 获取分类选项（用于下拉选择）
   */
  async getOptions() {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      `SELECT type_id, type_name, type_pid
       FROM bb_type
       WHERE type_mid = 1 AND type_status = 1
       ORDER BY type_sort ASC, type_id ASC`,
    );

    // 构建树形选项
    const items = rows || [];
    const parents = items.filter((r) => !r.type_pid);
    const children = items.filter((r) => r.type_pid);

    const options = parents.map((p) => ({
      type_id: p.type_id,
      type_name: p.type_name,
      children: children
        .filter((c) => c.type_pid === p.type_id)
        .map((c) => ({
          type_id: c.type_id,
          type_name: c.type_name,
        })),
    }));

    return { options };
  }
}
