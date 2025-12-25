import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const nowSec = () => Math.floor(Date.now() / 1000);

@Injectable()
export class AdminRoleService {
  constructor(private readonly db: MySQLService) {}

  async list(params: { page?: number; pageSize?: number; keyword?: string; status?: number }) {
    const pool = this.db.getPool();
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const values: any[] = [];

    if (params.keyword) {
      where += ' AND (role_name LIKE ? OR role_en LIKE ?)';
      values.push(`%${params.keyword}%`, `%${params.keyword}%`);
    }
    if (params.status !== undefined && params.status !== null) {
      where += ' AND role_status = ?';
      values.push(params.status);
    }

    const [[{ cnt }]] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) as cnt FROM bb_role WHERE ${where}`, values);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT role_id, role_name, role_en, role_pic, role_actor_name, role_status, role_level, role_hits, role_time_add
       FROM bb_role WHERE ${where} ORDER BY role_id DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return { items: rows, total: cnt };
  }

  async detail(id: number) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM bb_role WHERE role_id = ? LIMIT 1', [id]);
    return { item: rows[0] || null };
  }

  async save(data: Record<string, any>) {
    const pool = this.db.getPool();
    const now = nowSec();

    if (data.role_id) {
      const fields = [
        'role_name', 'role_en', 'role_status', 'role_lock', 'role_letter', 'role_color', 'role_actor_id',
        'role_actor_name', 'role_pic', 'role_blurb', 'role_remarks', 'role_tag', 'role_class', 'role_level',
        'role_tpl', 'role_jumpurl', 'role_content'
      ];
      const sets = fields.map((f) => `${f} = ?`).join(', ');
      const vals = fields.map((f) => data[f] ?? '');
      await pool.query(`UPDATE bb_role SET ${sets}, role_time = ? WHERE role_id = ?`, [...vals, now, data.role_id]);
      return { ok: true };
    } else {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO bb_role (role_name, role_en, role_status, role_lock, role_letter, role_color, role_actor_id,
          role_actor_name, role_pic, role_blurb, role_remarks, role_tag, role_class, role_level, role_tpl,
          role_jumpurl, role_content, role_time, role_time_add)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.role_name || '', data.role_en || '', data.role_status ?? 1, data.role_lock ?? 0, data.role_letter || '',
          data.role_color || '', data.role_actor_id ?? 0, data.role_actor_name || '', data.role_pic || '',
          data.role_blurb || '', data.role_remarks || '', data.role_tag || '', data.role_class || '',
          data.role_level ?? 0, data.role_tpl || '', data.role_jumpurl || '', data.role_content || '', now, now
        ]
      );
      return { ok: true, id: result.insertId };
    }
  }

  async delete(id: number) {
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_role WHERE role_id = ?', [id]);
    return { ok: true };
  }

  async batchDelete(ids: number[]) {
    if (!ids.length) return { ok: true, deleted: 0 };
    const pool = this.db.getPool();
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM bb_role WHERE role_id IN (?)', [ids]);
    return { ok: true, deleted: result.affectedRows };
  }

  async batchUpdateStatus(ids: number[], status: number) {
    if (!ids.length) return { ok: true, updated: 0 };
    const pool = this.db.getPool();
    const now = nowSec();
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE bb_role SET role_status = ?, role_time = ? WHERE role_id IN (?)',
      [status, now, ids]
    );
    return { ok: true, updated: result.affectedRows };
  }
}
