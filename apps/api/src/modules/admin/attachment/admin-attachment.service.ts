import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const nowSec = () => Math.floor(Date.now() / 1000);

@Injectable()
export class AdminAttachmentService {
  constructor(private readonly db: MySQLService) {}

  async list(params: { page?: number; pageSize?: number; keyword?: string; module?: string }) {
    const pool = this.db.getPool();
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const values: any[] = [];

    if (params.keyword) {
      where += ' AND name LIKE ?';
      values.push(`%${params.keyword}%`);
    }
    if (params.module) {
      where += ' AND module = ?';
      values.push(params.module);
    }

    const [[{ cnt }]] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) as cnt FROM bb_attachment WHERE ${where}`, values);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, path, url, size, mime_type, ext, module, ref_id, status, created_at
       FROM bb_attachment WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return { items: rows, total: cnt };
  }

  async detail(id: number) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM bb_attachment WHERE id = ? LIMIT 1', [id]);
    return { item: rows[0] || null };
  }

  async save(data: {
    id?: number;
    name: string;
    path: string;
    url: string;
    size?: number;
    mime_type?: string;
    ext?: string;
    md5?: string;
    module?: string;
    ref_id?: number;
    admin_id?: number;
    member_id?: number;
    status?: number;
  }) {
    const pool = this.db.getPool();
    const now = nowSec();

    if (data.id) {
      await pool.query(
        `UPDATE bb_attachment SET name = ?, path = ?, url = ?, size = ?, mime_type = ?, ext = ?, md5 = ?,
         module = ?, ref_id = ?, status = ?, updated_at = ? WHERE id = ?`,
        [
          data.name, data.path, data.url, data.size ?? 0, data.mime_type || '', data.ext || '', data.md5 || '',
          data.module || '', data.ref_id ?? 0, data.status ?? 1, now, data.id
        ]
      );
      return { ok: true };
    } else {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO bb_attachment (name, path, url, size, mime_type, ext, md5, module, ref_id, admin_id, member_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name, data.path, data.url, data.size ?? 0, data.mime_type || '', data.ext || '', data.md5 || '',
          data.module || '', data.ref_id ?? 0, data.admin_id ?? 0, data.member_id ?? 0, data.status ?? 1, now, now
        ]
      );
      return { ok: true, id: result.insertId };
    }
  }

  async delete(id: number) {
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_attachment WHERE id = ?', [id]);
    return { ok: true };
  }

  async batchDelete(ids: number[]) {
    if (!ids.length) return { ok: true, deleted: 0 };
    const pool = this.db.getPool();
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM bb_attachment WHERE id IN (?)', [ids]);
    return { ok: true, deleted: result.affectedRows };
  }
}
