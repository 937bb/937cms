import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

@Injectable()
export class ThemeSettingsService {
  constructor(private readonly db: MySQLService) {}

  async get(themeId: string) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT theme_id, value_json, updated_at FROM bb_theme_setting WHERE theme_id = ? LIMIT 1',
      [themeId],
    );
    const row = rows?.[0];
    if (!row) return { themeId, value: {}, updatedAt: 0 };
    return { themeId: row.theme_id, value: JSON.parse(row.value_json || '{}'), updatedAt: row.updated_at };
  }

  async save(themeId: string, value: unknown) {
    const pool = this.db.getPool();
    const now = Math.floor(Date.now() / 1000);
    const json = JSON.stringify(value ?? {});
    await pool.query(
      'INSERT INTO bb_theme_setting (theme_id, value_json, updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value_json=VALUES(value_json), updated_at=VALUES(updated_at)',
      [themeId, json, now],
    );
    return { ok: true, themeId, updatedAt: now };
  }
}
