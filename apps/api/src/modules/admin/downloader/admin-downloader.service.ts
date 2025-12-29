import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const nowSec = () => Math.floor(Date.now() / 1000);

@Injectable()
export class AdminDownloaderService {
  constructor(private readonly db: MySQLService) {}

  async list() {
    const pool = this.db.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, from_key, display_name, description, tip, parse_mode, status, sort, created_at, updated_at FROM bb_downloader ORDER BY sort DESC, id ASC'
    );
    return { items: rows };
  }

  async detail(id: number) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM bb_downloader WHERE id = ? LIMIT 1', [id]);
    return { item: rows[0] || null };
  }

  async save(data: {
    id?: number;
    from_key: string;
    display_name?: string;
    description?: string;
    tip?: string;
    parse_url?: string;
    parse_mode?: number;
    target?: string;
    downloader_code?: string;
    sort?: number;
    status?: number;
  }) {
    const pool = this.db.getPool();
    const now = nowSec();

    if (data.id) {
      await pool.query(
        `UPDATE bb_downloader SET from_key = ?, display_name = ?, description = ?, tip = ?, parse_url = ?,
         parse_mode = ?, target = ?, downloader_code = ?, sort = ?, status = ?, updated_at = ? WHERE id = ?`,
        [
          data.from_key, data.display_name || '', data.description || '', data.tip || '', data.parse_url || '',
          data.parse_mode ?? 0, data.target || '_self', data.downloader_code || '', data.sort ?? 0, data.status ?? 1, now, data.id
        ]
      );
      return { ok: true };
    } else {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO bb_downloader (from_key, display_name, description, tip, parse_url, parse_mode, target, downloader_code, sort, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.from_key, data.display_name || '', data.description || '', data.tip || '', data.parse_url || '',
          data.parse_mode ?? 0, data.target || '_self', data.downloader_code || '', data.sort ?? 0, data.status ?? 1, now, now
        ]
      );
      return { ok: true, id: result.insertId };
    }
  }

  async delete(id: number) {
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_downloader WHERE id = ?', [id]);
    return { ok: true };
  }

  async batchDelete(ids: number[]) {
    if (!ids.length) return { ok: true, deleted: 0 };
    const pool = this.db.getPool();
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM bb_downloader WHERE id IN (?)', [ids]);
    return { ok: true, deleted: result.affectedRows };
  }

  async batchUpdateStatus(ids: number[], status: number) {
    if (!ids.length) return { ok: true, updated: 0 };
    const pool = this.db.getPool();
    const now = nowSec();
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE bb_downloader SET status = ?, updated_at = ? WHERE id IN (?)',
      [status, now, ids]
    );
    return { ok: true, updated: result.affectedRows };
  }
}
