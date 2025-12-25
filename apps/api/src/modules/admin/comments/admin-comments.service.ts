import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

@Injectable()
export class AdminCommentsService {
  constructor(private readonly db: MySQLService) {}

  private get pool() {
    return this.db.getPool();
  }

  async list(query: { page?: number; pageSize?: number; mid?: number; status?: number }) {
    const { page = 1, pageSize = 20, mid, status } = query;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const params: any[] = [];

    if (mid !== undefined) {
      where += ' AND c.mid = ?';
      params.push(mid);
    }
    if (status !== undefined) {
      where += ' AND c.status = ?';
      params.push(status);
    }

    const [[{ total }]] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM bb_comment c WHERE ${where}`,
      params
    );

    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT c.*, m.username, m.nickname FROM bb_comment c
       LEFT JOIN bb_member m ON c.user_id = m.id
       WHERE ${where} ORDER BY c.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { page, pageSize, total, list: rows };
  }

  async updateStatus(id: number, status: number) {
    await this.pool.query(
      'UPDATE bb_comment SET status = ? WHERE id = ?',
      [status, id]
    );
    return { ok: true };
  }

  async delete(id: number) {
    await this.pool.query('DELETE FROM bb_comment WHERE id = ?', [id]);
    return { ok: true };
  }

  async batchDelete(ids: number[]) {
    if (!ids.length) return { ok: true, deleted: 0 };
    const [result] = await this.pool.query<ResultSetHeader>(
      'DELETE FROM bb_comment WHERE id IN (?)',
      [ids]
    );
    return { ok: true, deleted: result.affectedRows };
  }

  async batchUpdateStatus(ids: number[], status: number) {
    if (!ids.length) return { ok: true, updated: 0 };
    const [result] = await this.pool.query<ResultSetHeader>(
      'UPDATE bb_comment SET status = ? WHERE id IN (?)',
      [status, ids]
    );
    return { ok: true, updated: result.affectedRows };
  }
}
