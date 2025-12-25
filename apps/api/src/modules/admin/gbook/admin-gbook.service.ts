import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

@Injectable()
export class AdminGbookService {
  constructor(private readonly db: MySQLService) {}

  private get pool() {
    return this.db.getPool();
  }

  async list(query: { page?: number; pageSize?: number; status?: number }) {
    const { page = 1, pageSize = 20, status } = query;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const params: any[] = [];

    if (status !== undefined) {
      where += ' AND status = ?';
      params.push(status);
    }

    const [[{ total }]] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM bb_gbook WHERE ${where}`,
      params
    );

    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT g.*, m.username, m.nickname FROM bb_gbook g
       LEFT JOIN bb_member m ON g.user_id = m.id
       WHERE ${where} ORDER BY g.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { page, pageSize, total, list: rows };
  }

  async reply(id: number, reply: string) {
    const now = Math.floor(Date.now() / 1000);
    await this.pool.query(
      'UPDATE bb_gbook SET reply = ?, reply_time = ? WHERE id = ?',
      [reply, now, id]
    );
    return { ok: true };
  }

  async updateStatus(id: number, status: number) {
    await this.pool.query(
      'UPDATE bb_gbook SET status = ? WHERE id = ?',
      [status, id]
    );
    return { ok: true };
  }

  async delete(id: number) {
    await this.pool.query('DELETE FROM bb_gbook WHERE id = ?', [id]);
    return { ok: true };
  }

  async batchDelete(ids: number[]) {
    if (!ids.length) return { ok: true, deleted: 0 };
    const [result] = await this.pool.query<ResultSetHeader>(
      'DELETE FROM bb_gbook WHERE id IN (?)',
      [ids]
    );
    return { ok: true, deleted: result.affectedRows };
  }

  async batchUpdateStatus(ids: number[], status: number) {
    if (!ids.length) return { ok: true, updated: 0 };
    const [result] = await this.pool.query<ResultSetHeader>(
      'UPDATE bb_gbook SET status = ? WHERE id IN (?)',
      [status, ids]
    );
    return { ok: true, updated: result.affectedRows };
  }
}
