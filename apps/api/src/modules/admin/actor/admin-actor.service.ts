import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const nowSec = () => Math.floor(Date.now() / 1000);

@Injectable()
export class AdminActorService {
  constructor(private readonly db: MySQLService) {}

  async list(params: { page?: number; pageSize?: number; keyword?: string; status?: number }) {
    const pool = this.db.getPool();
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const values: any[] = [];

    if (params.keyword) {
      where += ' AND (actor_name LIKE ? OR actor_en LIKE ?)';
      values.push(`%${params.keyword}%`, `%${params.keyword}%`);
    }
    if (params.status !== undefined && params.status !== null) {
      where += ' AND actor_status = ?';
      values.push(params.status);
    }

    const [[{ cnt }]] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) as cnt FROM bb_actor WHERE ${where}`, values);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT actor_id, actor_name, actor_en, actor_pic, actor_sex, actor_area, actor_status, actor_level, actor_hits, actor_time_add
       FROM bb_actor WHERE ${where} ORDER BY actor_id DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return { items: rows, total: cnt };
  }

  async detail(id: number) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM bb_actor WHERE actor_id = ? LIMIT 1', [id]);
    return { item: rows[0] || null };
  }

  async save(data: Record<string, any>) {
    const pool = this.db.getPool();
    const now = nowSec();

    if (data.actor_id) {
      const fields = [
        'actor_name', 'actor_en', 'actor_alias', 'actor_status', 'actor_lock', 'actor_letter', 'actor_sex',
        'actor_color', 'actor_pic', 'actor_blurb', 'actor_remarks', 'actor_area', 'actor_height', 'actor_weight',
        'actor_birthday', 'actor_birtharea', 'actor_blood', 'actor_starsign', 'actor_school', 'actor_works',
        'actor_tag', 'actor_class', 'actor_level', 'actor_tpl', 'actor_jumpurl', 'actor_content'
      ];
      const sets = fields.map((f) => `${f} = ?`).join(', ');
      const vals = fields.map((f) => data[f] ?? '');
      await pool.query(`UPDATE bb_actor SET ${sets}, actor_time = ? WHERE actor_id = ?`, [...vals, now, data.actor_id]);
      return { ok: true };
    } else {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO bb_actor (actor_name, actor_en, actor_alias, actor_status, actor_lock, actor_letter, actor_sex,
          actor_color, actor_pic, actor_blurb, actor_remarks, actor_area, actor_height, actor_weight, actor_birthday,
          actor_birtharea, actor_blood, actor_starsign, actor_school, actor_works, actor_tag, actor_class, actor_level,
          actor_tpl, actor_jumpurl, actor_content, actor_time, actor_time_add)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.actor_name || '', data.actor_en || '', data.actor_alias || '', data.actor_status ?? 1, data.actor_lock ?? 0,
          data.actor_letter || '', data.actor_sex || '', data.actor_color || '', data.actor_pic || '', data.actor_blurb || '',
          data.actor_remarks || '', data.actor_area || '', data.actor_height || '', data.actor_weight || '', data.actor_birthday || '',
          data.actor_birtharea || '', data.actor_blood || '', data.actor_starsign || '', data.actor_school || '', data.actor_works || '',
          data.actor_tag || '', data.actor_class || '', data.actor_level ?? 0, data.actor_tpl || '', data.actor_jumpurl || '',
          data.actor_content || '', now, now
        ]
      );
      return { ok: true, id: result.insertId };
    }
  }

  async delete(id: number) {
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_actor WHERE actor_id = ?', [id]);
    return { ok: true };
  }

  async batchDelete(ids: number[]) {
    if (!ids.length) return { ok: true, deleted: 0 };
    const pool = this.db.getPool();
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM bb_actor WHERE actor_id IN (?)', [ids]);
    return { ok: true, deleted: result.affectedRows };
  }

  async batchUpdateStatus(ids: number[], status: number) {
    if (!ids.length) return { ok: true, updated: 0 };
    const pool = this.db.getPool();
    const now = nowSec();
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE bb_actor SET actor_status = ?, actor_time = ? WHERE actor_id IN (?)',
      [status, now, ids]
    );
    return { ok: true, updated: result.affectedRows };
  }
}
