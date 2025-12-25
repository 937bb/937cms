import { BadRequestException, Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import type { RowDataPacket } from 'mysql2/promise';

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

@Injectable()
export class PublicGbookService {
  constructor(private readonly db: MySQLService) {}

  private get pool() {
    return this.db.getPool();
  }

  private async getGbookSettings() {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      "SELECT value_json FROM bb_setting WHERE `key` = 'comment' LIMIT 1",
    );
    const row = rows?.[0] as any;
    if (!row?.value_json) {
      return { status: 1, audit: 1, login: 0, verify: 0, pagesize: 20, timespan: 10 };
    }
    try {
      const parsed = JSON.parse(String(row.value_json || '{}')) || {};
      const g = (parsed && typeof parsed === 'object' && parsed.gbook) ? parsed.gbook : {};
      return {
        status: Number(g.status ?? 1) ? 1 : 0,
        audit: Number(g.audit ?? 1) ? 1 : 0,
        login: Number(g.login ?? 0) ? 1 : 0,
        verify: Number(g.verify ?? 0) ? 1 : 0,
        pagesize: Number(g.pagesize ?? 20) || 20,
        timespan: Number(g.timespan ?? 10) || 0,
      };
    } catch {
      return { status: 1, audit: 1, login: 0, verify: 0, pagesize: 20, timespan: 10 };
    }
  }

  async list(query: { rid?: number; page?: number; pageSize?: number }) {
    const rid = Number(query.rid || 0);
    const page = Math.max(1, Number(query.page || 1));
    const settings = await this.getGbookSettings();
    const defaultPageSize = settings.pagesize || 20;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || defaultPageSize)));
    const offset = (page - 1) * pageSize;

    const pool = this.pool;

    const where = ['status = 1'];
    const params: any[] = [];
    if (rid > 0) {
      where.push('rid = ?');
      params.push(rid);
    }
    const whereSQL = `WHERE ${where.join(' AND ')}`;

    const [countRows] = await pool.query<any[]>(`SELECT COUNT(*) as c FROM bb_gbook ${whereSQL}`, params);
    const total = Number(countRows?.[0]?.c || 0);

    const [rows] = await pool.query<any[]>(
      `SELECT id, rid, user_id, name, content, reply, reply_time, created_at
       FROM bb_gbook
       ${whereSQL}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    return {
      page,
      pageSize,
      total,
      list: (rows || []).map((r) => ({
        id: r.id,
        rid: r.rid,
        userId: r.user_id,
        name: r.name,
        content: r.content,
        reply: r.reply || '',
        replyTime: r.reply_time || 0,
        createdAt: r.created_at,
      })),
    };
  }

  async add(input: { rid?: number; name?: string; content: string; userId?: number }, ip: string) {
    const settings = await this.getGbookSettings();
    if (Number(settings.status || 0) !== 1) {
      throw new BadRequestException('留言板已关闭');
    }

    const rid = Number(input.rid || 0);
    const name = String(input.name || '游客').trim().slice(0, 60);
    const content = String(input.content || '').trim();
    const userId = Number(input.userId || 0);

    if (!content || content.length < 2) {
      throw new BadRequestException('留言内容不能少于2个字符');
    }
    if (content.length > 500) {
      throw new BadRequestException('留言内容不能超过500个字符');
    }

    if (Number(settings.login || 0) === 1 && userId <= 0) {
      throw new BadRequestException('请登录后留言');
    }

    const timespan = Math.max(0, Math.min(3600, Number(settings.timespan || 0)));
    const ipStr = String(ip || '').trim();
    if (timespan > 0 && ipStr) {
      const since = nowSec() - timespan;
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT id FROM bb_gbook WHERE ip = ? AND created_at >= ? ORDER BY id DESC LIMIT 1',
        [ipStr, since],
      );
      if ((rows || []).length) throw new BadRequestException(`留言过于频繁，请 ${timespan}s 后再试`);
    }

    const pool = this.pool;
    const t = nowSec();

    // audit=1 => 需要审核 => status=0；audit=0 => 直接通过
    const status = Number(settings.audit || 0) === 1 ? 0 : 1;
    const [res] = await pool.query<any>(
      `INSERT INTO bb_gbook (rid, user_id, status, name, ip, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [rid, userId, status, name, ipStr, content, t],
    );

    return { ok: true, id: res.insertId };
  }
}
