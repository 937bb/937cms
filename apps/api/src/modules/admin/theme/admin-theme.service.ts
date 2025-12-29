import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const nowSec = () => Math.floor(Date.now() / 1000);

@Injectable()
export class AdminThemeService {
  constructor(private readonly db: MySQLService) {}

  async list() {
    const pool = this.db.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, theme_name, status, created_at, updated_at FROM bb_theme_config ORDER BY id ASC',
    );
    return rows;
  }

  async getConfig(themeName: string) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT config FROM bb_theme_config WHERE theme_name = ?',
      [themeName],
    );
    if (!rows.length) return {};
    try {
      return typeof rows[0].config === 'string'
        ? JSON.parse(rows[0].config)
        : rows[0].config || {};
    } catch {
      return {};
    }
  }

  async saveConfig(themeName: string, config: Record<string, any>) {
    const pool = this.db.getPool();
    const now = nowSec();
    const [exists] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM bb_theme_config WHERE theme_name = ?',
      [themeName],
    );
    if (exists.length) {
      await pool.query(
        'UPDATE bb_theme_config SET config = ?, updated_at = ? WHERE theme_name = ?',
        [JSON.stringify(config), now, themeName],
      );
    } else {
      await pool.query<ResultSetHeader>(
        'INSERT INTO bb_theme_config (theme_name, config, status, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
        [themeName, JSON.stringify(config), now, now],
      );
    }
    return { success: true };
  }

  async updateStatus(themeName: string, status: number) {
    const pool = this.db.getPool();
    await pool.query(
      'UPDATE bb_theme_config SET status = ?, updated_at = ? WHERE theme_name = ?',
      [status, nowSec(), themeName],
    );
    return { success: true };
  }
}
