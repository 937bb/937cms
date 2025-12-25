import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const nowSec = () => Math.floor(Date.now() / 1000);

@Injectable()
export class AdminTopicService {
  constructor(private readonly db: MySQLService) {}

  async list(params: { page?: number; pageSize?: number; keyword?: string; status?: number }) {
    const pool = this.db.getPool();
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const values: any[] = [];

    if (params.keyword) {
      where += ' AND (topic_name LIKE ? OR topic_en LIKE ?)';
      values.push(`%${params.keyword}%`, `%${params.keyword}%`);
    }
    if (params.status !== undefined && params.status !== null) {
      where += ' AND topic_status = ?';
      values.push(params.status);
    }

    const [[{ cnt }]] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) as cnt FROM bb_topic WHERE ${where}`, values);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT topic_id, topic_name, topic_en, topic_pic, topic_status, topic_sort, topic_level, topic_hits, topic_time_add
       FROM bb_topic WHERE ${where} ORDER BY topic_sort DESC, topic_id DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return { items: rows, total: cnt };
  }

  async detail(id: number) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM bb_topic WHERE topic_id = ? LIMIT 1', [id]);
    return { item: rows[0] || null };
  }

  async save(data: Record<string, any>) {
    const pool = this.db.getPool();
    const now = nowSec();

    if (data.topic_id) {
      const fields = [
        'topic_name', 'topic_en', 'topic_sub', 'topic_status', 'topic_sort', 'topic_letter', 'topic_color',
        'topic_tpl', 'topic_type', 'topic_pic', 'topic_pic_thumb', 'topic_pic_slide', 'topic_key', 'topic_des',
        'topic_title', 'topic_blurb', 'topic_remarks', 'topic_level', 'topic_tag', 'topic_rel_vod', 'topic_rel_art', 'topic_content'
      ];
      const sets = fields.map((f) => `${f} = ?`).join(', ');
      const vals = fields.map((f) => data[f] ?? '');
      await pool.query(`UPDATE bb_topic SET ${sets}, topic_time = ? WHERE topic_id = ?`, [...vals, now, data.topic_id]);
      return { ok: true };
    } else {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO bb_topic (topic_name, topic_en, topic_sub, topic_status, topic_sort, topic_letter, topic_color,
          topic_tpl, topic_type, topic_pic, topic_pic_thumb, topic_pic_slide, topic_key, topic_des, topic_title,
          topic_blurb, topic_remarks, topic_level, topic_tag, topic_rel_vod, topic_rel_art, topic_content, topic_time, topic_time_add)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.topic_name || '', data.topic_en || '', data.topic_sub || '', data.topic_status ?? 1, data.topic_sort ?? 0,
          data.topic_letter || '', data.topic_color || '', data.topic_tpl || '', data.topic_type || '', data.topic_pic || '',
          data.topic_pic_thumb || '', data.topic_pic_slide || '', data.topic_key || '', data.topic_des || '', data.topic_title || '',
          data.topic_blurb || '', data.topic_remarks || '', data.topic_level ?? 0, data.topic_tag || '',
          data.topic_rel_vod || '', data.topic_rel_art || '', data.topic_content || '', now, now
        ]
      );
      return { ok: true, id: result.insertId };
    }
  }

  async delete(id: number) {
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_topic WHERE topic_id = ?', [id]);
    return { ok: true };
  }

  async batchDelete(ids: number[]) {
    if (!ids.length) return { ok: true, deleted: 0 };
    const pool = this.db.getPool();
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM bb_topic WHERE topic_id IN (?)', [ids]);
    return { ok: true, deleted: result.affectedRows };
  }

  async batchUpdateStatus(ids: number[], status: number) {
    if (!ids.length) return { ok: true, updated: 0 };
    const pool = this.db.getPool();
    const now = nowSec();
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE bb_topic SET topic_status = ?, topic_time = ? WHERE topic_id IN (?)',
      [status, now, ids]
    );
    return { ok: true, updated: result.affectedRows };
  }
}
