import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const nowSec = () => Math.floor(Date.now() / 1000);

@Injectable()
export class AdminArticlesService {
  constructor(private readonly db: MySQLService) {}

  private get pool() {
    return this.db.getPool();
  }

  async list(query: {
    page?: number;
    pageSize?: number;
    typeId?: number;
    keyword?: string;
    status?: number;
  }) {
    const { page = 1, pageSize = 20, typeId, keyword, status } = query;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const params: any[] = [];

    if (typeId) {
      where += ' AND (type_id = ? OR type_id_1 = ?)';
      params.push(typeId, typeId);
    }
    if (keyword) {
      where += ' AND (name LIKE ? OR tag LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (status !== undefined) {
      where += ' AND status = ?';
      params.push(status);
    }

    const [[{ total }]] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM bb_article WHERE ${where}`,
      params
    );

    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id, type_id, type_id_1, name, pic, author, source, tag, level, status, hits, created_at, updated_at
       FROM bb_article WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { page, pageSize, total, list: rows };
  }

  async detail(id: number) {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT * FROM bb_article WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  }

  async save(data: {
    id?: number;
    typeId: number;
    typeId1?: number;
    name: string;
    sub?: string;
    letter?: string;
    color?: string;
    pic?: string;
    picThumb?: string;
    author?: string;
    source?: string;
    tag?: string;
    blurb?: string;
    remarks?: string;
    content?: string;
    level?: number;
    status?: number;
    jumpUrl?: string;
  }) {
    const now = nowSec();

    if (data.id) {
      await this.pool.query(
        `UPDATE bb_article SET type_id = ?, type_id_1 = ?, name = ?, sub = ?, letter = ?, color = ?,
         pic = ?, pic_thumb = ?, author = ?, source = ?, tag = ?, blurb = ?, remarks = ?,
         content = ?, level = ?, status = ?, jump_url = ?, updated_at = ? WHERE id = ?`,
        [
          data.typeId, data.typeId1 || 0, data.name, data.sub || '', data.letter || '',
          data.color || '', data.pic || '', data.picThumb || '', data.author || '',
          data.source || '', data.tag || '', data.blurb || '', data.remarks || '',
          data.content || '', data.level || 0, data.status ?? 1, data.jumpUrl || '', now, data.id
        ]
      );
      return { ok: true };
    } else {
      const [result] = await this.pool.query<ResultSetHeader>(
        `INSERT INTO bb_article (type_id, type_id_1, name, sub, letter, color, pic, pic_thumb,
         author, source, tag, blurb, remarks, content, level, status, jump_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.typeId, data.typeId1 || 0, data.name, data.sub || '', data.letter || '',
          data.color || '', data.pic || '', data.picThumb || '', data.author || '',
          data.source || '', data.tag || '', data.blurb || '', data.remarks || '',
          data.content || '', data.level || 0, data.status ?? 1, data.jumpUrl || '', now, now
        ]
      );
      return { ok: true, id: result.insertId };
    }
  }

  async delete(id: number) {
    await this.pool.query('DELETE FROM bb_article WHERE id = ?', [id]);
    return { ok: true };
  }

  async batchDelete(ids: number[]) {
    if (!ids.length) return { ok: true, deleted: 0 };
    const [result] = await this.pool.query<ResultSetHeader>(
      'DELETE FROM bb_article WHERE id IN (?)',
      [ids]
    );
    return { ok: true, deleted: result.affectedRows };
  }

  async batchUpdateStatus(ids: number[], status: number) {
    if (!ids.length) return { ok: true, updated: 0 };
    const [result] = await this.pool.query<ResultSetHeader>(
      'UPDATE bb_article SET status = ?, updated_at = ? WHERE id IN (?)',
      [status, nowSec(), ids]
    );
    return { ok: true, updated: result.affectedRows };
  }
}
