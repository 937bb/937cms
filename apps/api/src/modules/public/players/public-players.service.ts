import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

@Injectable()
export class PublicPlayersService {
  constructor(private readonly db: MySQLService) {}

  async list() {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT from_key, display_name, parse_url, parse_mode, sort FROM bb_player WHERE status = 1 ORDER BY sort ASC, id ASC',
    );
    return rows.map((r) => ({
      from: r.from_key,
      name: r.display_name,
      parseUrl: r.parse_url,
      parseMode: r.parse_mode,
      sort: r.sort,
    }));
  }
}
