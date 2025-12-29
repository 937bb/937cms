import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { MySQLService } from '../../../db/mysql.service';
import { PublicMemberGroupService } from '../../public/member-group/public-member-group.service';

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
 * 会员组保存参数
 */
export type GroupSaveInput = {
  id?: number;
  name: string;
  remark?: string;
  level?: number;
  status?: number;
  type_ids?: string;
  popedom?: string;
  points_day?: number;
  points_week?: number;
  points_month?: number;
  points_free?: number;
};

/**
 * 会员列表查询参数
 */
export type MemberListInput = {
  page: number;
  pageSize: number;
  q?: string;
  status?: number;
  groupId?: number;
};

/**
 * 会员保存参数
 */
export type MemberSaveInput = {
  id: number;
  nickname?: string;
  email?: string;
  avatar?: string;
  group_id?: number;
  points?: number;
  expire_at?: number;
  status?: number;
};

/**
 * 会员管理服务
 * 提供会员和会员组的增删改查、批量操作等功能
 */
@Injectable()
export class AdminMemberService {
  constructor(
    private readonly db: MySQLService,
    private readonly publicMemberGroup: PublicMemberGroupService,
  ) {}

  // ==================== 会员组管理 ====================

  /**
   * 获取会员组列表
   * 包含各组的会员数量统计
   */
  async listGroups() {
    const pool = this.db.getPool();

    // 获取所有会员组
    const [rows] = await pool.query<any[]>(
      `SELECT id, name, remark, level, status, type_ids, popedom,
              points_day, points_week, points_month, points_free,
              created_at, updated_at
       FROM bb_member_group
       ORDER BY level ASC, id ASC`,
    );

    // 获取各组会员数量
    const [counts] = await pool.query<any[]>(
      'SELECT group_id, COUNT(*) as count FROM bb_member GROUP BY group_id',
    );
    const countMap = new Map<number, number>();
    for (const row of counts || []) {
      countMap.set(Number(row.group_id), Number(row.count));
    }

    // 添加会员数量
    const items = (rows || []).map((r) => ({
      ...r,
      member_count: countMap.get(r.id) || 0,
    }));

    return { items };
  }

  /**
   * 获取会员组详情
   */
  async getGroup(id: number) {
    if (!id) throw new BadRequestException('id 无效');

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM bb_member_group WHERE id = ? LIMIT 1',
      [id],
    );
    if (!rows?.[0]) throw new NotFoundException('会员组不存在');

    return { item: rows[0] };
  }

  /**
   * 保存会员组（新增或更新）
   */
  async saveGroup(input: GroupSaveInput) {
    const pool = this.db.getPool();
    const id = Number(input.id || 0);
    const name = trim(input.name);
    const remark = trim(input.remark || '');
    const level = Number(input.level || 0);
    const status = input.status === undefined ? 1 : (Number(input.status) ? 1 : 0);
    const typeIds = trim(input.type_ids || '');
    const popedom = trim(input.popedom || '');
    const pointsDay = Number(input.points_day || 0);
    const pointsWeek = Number(input.points_week || 0);
    const pointsMonth = Number(input.points_month || 0);
    const pointsFree = Number(input.points_free) ? 1 : 0;

    if (name.length < 2) throw new BadRequestException('名称至少2个字符');

    // 检查名称重复
    const [dup] = await pool.query<any[]>(
      'SELECT id FROM bb_member_group WHERE name = ? AND id <> ? LIMIT 1',
      [name, id],
    );
    if (dup?.[0]) throw new BadRequestException('会员组名称已存在');

    const now = nowTs();

    if (!id) {
      // 新增
      const [res] = await pool.query<any>(
        `INSERT INTO bb_member_group
         (name, remark, level, status, type_ids, popedom, points_day, points_week, points_month, points_free, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [name, remark, level, status, typeIds, popedom, pointsDay, pointsWeek, pointsMonth, pointsFree, now, now],
      );
      this.publicMemberGroup.clearCache();
      return { ok: true, id: res.insertId };
    }

    // 更新
    const [exists] = await pool.query<any[]>('SELECT id FROM bb_member_group WHERE id = ? LIMIT 1', [id]);
    if (!exists?.[0]) throw new NotFoundException('会员组不存在');

    await pool.query(
      `UPDATE bb_member_group SET
       name = ?, remark = ?, level = ?, status = ?, type_ids = ?, popedom = ?,
       points_day = ?, points_week = ?, points_month = ?, points_free = ?, updated_at = ?
       WHERE id = ?`,
      [name, remark, level, status, typeIds, popedom, pointsDay, pointsWeek, pointsMonth, pointsFree, now, id],
    );
    this.publicMemberGroup.clearCache();
    return { ok: true };
  }

  /**
   * 删除会员组
   */
  async deleteGroup(id: number) {
    if (!id) throw new BadRequestException('id 无效');
    if (id === 1) throw new BadRequestException('默认会员组不能删除');

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SELECT id FROM bb_member_group WHERE id = ? LIMIT 1', [id]);
    if (!rows?.[0]) return { ok: true };

    // 检查是否有会员
    const [hasMembers] = await pool.query<any[]>('SELECT id FROM bb_member WHERE group_id = ? LIMIT 1', [id]);
    if (hasMembers?.[0]) throw new BadRequestException('该会员组下有会员，无法删除');

    await pool.query('DELETE FROM bb_member_group WHERE id = ? LIMIT 1', [id]);
    return { ok: true };
  }

  /**
   * 批量修改会员组状态
   */
  async batchUpdateGroupStatus(ids: number[], status: number) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('请选择要修改的会员组');
    }
    const groupIds = ids.map(Number).filter(Boolean);
    if (groupIds.length === 0) return { ok: true, updated: 0 };

    const pool = this.db.getPool();
    const placeholders = groupIds.map(() => '?').join(',');
    const statusVal = Number(status) ? 1 : 0;

    await pool.query(
      `UPDATE bb_member_group SET status = ?, updated_at = ? WHERE id IN (${placeholders})`,
      [statusVal, nowTs(), ...groupIds],
    );

    return { ok: true, updated: groupIds.length };
  }

  // ==================== 会员管理 ====================

  /**
   * 获取会员列表
   */
  async listMembers(input: MemberListInput) {
    const page = Math.max(1, Number(input.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(input.pageSize || 20)));
    const q = trim(input.q || '');
    const status = input.status === undefined ? undefined : Number(input.status);
    const groupId = input.groupId === undefined ? undefined : Number(input.groupId);

    const where: string[] = [];
    const params: any[] = [];

    if (q) {
      where.push('(m.username LIKE ? OR m.nickname LIKE ? OR m.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status === 0 || status === 1) {
      where.push('m.status = ?');
      params.push(status);
    }
    if (groupId) {
      where.push('m.group_id = ?');
      params.push(groupId);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const pool = this.db.getPool();
    const [countRows] = await pool.query<any[]>(`SELECT COUNT(*) as c FROM bb_member m ${whereSQL}`, params);
    const total = Number(countRows?.[0]?.c || 0);

    const offset = (page - 1) * pageSize;
    const [items] = await pool.query<any[]>(
      `SELECT m.id, m.username, m.nickname, m.email, m.avatar, m.group_id, g.name as group_name,
              m.points, m.points_used, m.expire_at, m.last_login_at, m.last_login_ip, m.login_count,
              m.status, m.created_at, m.updated_at
       FROM bb_member m
       LEFT JOIN bb_member_group g ON g.id = m.group_id
       ${whereSQL}
       ORDER BY m.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    return { page, pageSize, total, items: items || [] };
  }

  /**
   * 获取会员详情
   */
  async getMember(id: number) {
    if (!id) throw new BadRequestException('id 无效');

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      `SELECT m.*, g.name as group_name
       FROM bb_member m
       LEFT JOIN bb_member_group g ON g.id = m.group_id
       WHERE m.id = ? LIMIT 1`,
      [id],
    );
    if (!rows?.[0]) throw new NotFoundException('会员不存在');

    // 不返回密码哈希
    const item = { ...rows[0] };
    delete item.password_hash;

    return { item };
  }

  /**
   * 保存会员信息
   */
  async saveMember(input: MemberSaveInput) {
    const id = Number(input.id);
    if (!id) throw new BadRequestException('id 无效');

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SELECT id FROM bb_member WHERE id = ? LIMIT 1', [id]);
    if (!rows?.[0]) throw new NotFoundException('会员不存在');

    const fields: string[] = [];
    const params: any[] = [];

    if (input.nickname !== undefined) {
      fields.push('nickname = ?');
      params.push(trim(input.nickname));
    }
    if (input.email !== undefined) {
      fields.push('email = ?');
      params.push(trim(input.email));
    }
    if (input.avatar !== undefined) {
      fields.push('avatar = ?');
      params.push(trim(input.avatar));
    }
    if (input.group_id !== undefined) {
      const gid = Number(input.group_id);
      if (!gid) throw new BadRequestException('group_id 无效');
      const [g] = await pool.query<any[]>('SELECT id FROM bb_member_group WHERE id = ? LIMIT 1', [gid]);
      if (!g?.[0]) throw new BadRequestException('会员组不存在');
      fields.push('group_id = ?');
      params.push(gid);
    }
    if (input.points !== undefined) {
      fields.push('points = ?');
      params.push(Math.max(0, Number(input.points) || 0));
    }
    if (input.expire_at !== undefined) {
      fields.push('expire_at = ?');
      params.push(Math.max(0, Number(input.expire_at) || 0));
    }
    if (input.status !== undefined) {
      fields.push('status = ?');
      params.push(Number(input.status) ? 1 : 0);
    }

    fields.push('updated_at = ?');
    params.push(nowTs());
    params.push(id);

    await pool.query(`UPDATE bb_member SET ${fields.join(', ')} WHERE id = ?`, params);
    return { ok: true };
  }

  /**
   * 重置会员密码
   */
  async resetMemberPassword(id: number, passwordRaw: string) {
    if (!id) throw new BadRequestException('id 无效');
    const password = trim(passwordRaw);
    if (password.length < 6) throw new BadRequestException('密码至少6个字符');

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SELECT id FROM bb_member WHERE id = ? LIMIT 1', [id]);
    if (!rows?.[0]) throw new NotFoundException('会员不存在');

    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE bb_member SET password_hash = ?, updated_at = ? WHERE id = ?', [hash, nowTs(), id]);
    return { ok: true };
  }

  /**
   * 删除会员
   */
  async deleteMember(id: number) {
    if (!id) throw new BadRequestException('id 无效');
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_member WHERE id = ? LIMIT 1', [id]);
    return { ok: true };
  }

  /**
   * 批量删除会员
   */
  async batchDeleteMembers(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('请选择要删除的会员');
    }
    const memberIds = ids.map(Number).filter(Boolean);
    if (memberIds.length === 0) return { ok: true, deleted: 0 };

    const pool = this.db.getPool();
    const placeholders = memberIds.map(() => '?').join(',');
    await pool.query(`DELETE FROM bb_member WHERE id IN (${placeholders})`, memberIds);

    return { ok: true, deleted: memberIds.length };
  }

  /**
   * 批量修改会员字段
   */
  async batchUpdateMemberField(ids: number[], field: string, value: number) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('请选择要修改的会员');
    }
    const memberIds = ids.map(Number).filter(Boolean);
    if (memberIds.length === 0) return { ok: true, updated: 0 };

    // 只允许修改特定字段
    const allowedFields = ['status', 'group_id', 'points'];
    if (!allowedFields.includes(field)) {
      throw new BadRequestException('不支持修改该字段');
    }

    const pool = this.db.getPool();
    const placeholders = memberIds.map(() => '?').join(',');

    // 验证 group_id
    if (field === 'group_id') {
      const gid = Number(value);
      if (!gid) throw new BadRequestException('group_id 无效');
      const [g] = await pool.query<any[]>('SELECT id FROM bb_member_group WHERE id = ? LIMIT 1', [gid]);
      if (!g?.[0]) throw new BadRequestException('会员组不存在');
    }

    const val = field === 'status' ? (Number(value) ? 1 : 0) : Number(value);
    await pool.query(
      `UPDATE bb_member SET ${field} = ?, updated_at = ? WHERE id IN (${placeholders})`,
      [val, nowTs(), ...memberIds],
    );

    return { ok: true, updated: memberIds.length };
  }

  /**
   * 获取会员组选项（用于下拉选择）
   */
  async getGroupOptions() {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id, name, level FROM bb_member_group WHERE status = 1 ORDER BY level ASC, id ASC',
    );
    return { options: rows || [] };
  }
}
