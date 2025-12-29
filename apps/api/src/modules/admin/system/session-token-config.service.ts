import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import type { RowDataPacket } from 'mysql2/promise';

@Injectable()
export class SessionTokenConfigService {
  constructor(private readonly db: MySQLService) {}

  private get pool() {
    return this.db.getPool();
  }

  async getConfig() {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT * FROM bb_session_token_config LIMIT 1'
    );
    return rows[0] || { id: 1, enabled: 0, ttl: 7200 };
  }

  async updateConfig(data: { enabled: number; ttl: number }) {
    await this.pool.query(
      'UPDATE bb_session_token_config SET enabled = ?, ttl = ? WHERE id = 1',
      [data.enabled, data.ttl]
    );
    return this.getConfig();
  }
}
