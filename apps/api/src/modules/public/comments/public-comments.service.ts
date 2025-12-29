import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const nowSec = () => Math.floor(Date.now() / 1000);

@Injectable()
export class PublicCommentsService {
  constructor(private readonly db: MySQLService) {}

  private get pool() {
    return this.db.getPool();
  }

  private async getCommentSettings() {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      "SELECT value_json FROM bb_setting WHERE `key` = 'comment' LIMIT 1",
    );
    const row = rows?.[0] as any;
    if (!row?.value_json) {
      return { enabled: 1, audit: 0, needLogin: 0, maxLen: 300, cooldownSeconds: 10 };
    }
    try {
      const parsed = JSON.parse(String(row.value_json || '{}')) || {};

      // 兼容两种结构：
      // 1) 旧：{ enabled,audit,needLogin,maxLen,cooldownSeconds }
      // 2) 新（MacCMS）：{ gbook:{...}, comment:{ status,audit,login,verify,pagesize,timespan,maxLen,cooldownSeconds } }
      const c = (parsed && typeof parsed === 'object' && parsed.comment) ? parsed.comment : parsed;

      const enabled = Number((c as any)?.status ?? (c as any)?.enabled ?? 1) ? 1 : 0;
      const audit = Number((c as any)?.audit ?? 0) ? 1 : 0;
      const needLogin = Number((c as any)?.login ?? (c as any)?.needLogin ?? 0) ? 1 : 0;

      const maxLen = Number((c as any)?.maxLen ?? 300) || 300;
      const cooldownSeconds = Number((c as any)?.cooldownSeconds ?? (c as any)?.timespan ?? 10) || 0;

      return { enabled, audit, needLogin, maxLen, cooldownSeconds };
    } catch {
      return { enabled: 1, audit: 0, needLogin: 0, maxLen: 300, cooldownSeconds: 10 };
    }
  }

  async list(mid: number, rid: number, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    const [[{ total }]] = await this.pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM bb_comment WHERE mid = ? AND rid = ? AND status = 1 AND pid = 0',
      [mid, rid]
    );

    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT c.id, c.pid, c.user_id, c.name, c.content, c.digg_up, c.digg_down, c.created_at,
              m.username, m.nickname, m.avatar
       FROM bb_comment c
       LEFT JOIN bb_member m ON c.user_id = m.id
       WHERE c.mid = ? AND c.rid = ? AND c.status = 1 AND c.pid = 0
       ORDER BY c.id DESC
       LIMIT ? OFFSET ?`,
      [mid, rid, pageSize, offset]
    );

    // 获取回复
    const commentIds = rows.map((r) => r.id);
    let repliesMap: Record<number, any[]> = {};
    if (commentIds.length > 0) {
      const [replies] = await this.pool.query<RowDataPacket[]>(
        `SELECT c.id, c.pid, c.user_id, c.name, c.content, c.digg_up, c.digg_down, c.created_at,
                m.username, m.nickname, m.avatar
         FROM bb_comment c
         LEFT JOIN bb_member m ON c.user_id = m.id
         WHERE c.pid IN (?) AND c.status = 1
         ORDER BY c.id ASC`,
        [commentIds]
      );
      for (const r of replies) {
        if (!repliesMap[r.pid]) repliesMap[r.pid] = [];
        repliesMap[r.pid].push({
          id: r.id,
          userId: r.user_id,
          name: r.name || r.nickname || r.username || '匿名',
          avatar: r.avatar || '',
          content: r.content,
          diggUp: r.digg_up,
          diggDown: r.digg_down,
          createdAt: r.created_at,
        });
      }
    }

    const list = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name || r.nickname || r.username || '匿名',
      avatar: r.avatar || '',
      content: r.content,
      diggUp: r.digg_up,
      diggDown: r.digg_down,
      createdAt: r.created_at,
      replies: repliesMap[r.id] || [],
    }));

    return { page, pageSize, total, list };
  }

  async add(data: {
    mid: number;
    rid: number;
    pid?: number;
    userId?: number;
    name?: string;
    content: string;
    ip?: string;
  }) {
    const settings = await this.getCommentSettings();
    if (Number(settings.enabled || 0) !== 1) {
      return { ok: false, message: 'comment disabled' };
    }

    const content = String(data.content || '').trim();
    const maxLen = Math.max(10, Math.min(2000, Number(settings.maxLen || 300)));
    if (!content) return { ok: false, message: 'content required' };
    if (content.length > maxLen) return { ok: false, message: `content too long (max ${maxLen})` };

    if (Number(settings.needLogin || 0) === 1 && Number(data.userId || 0) <= 0) {
      return { ok: false, message: 'login required' };
    }

    const cooldownSeconds = Math.max(0, Math.min(3600, Number(settings.cooldownSeconds || 0)));
    const ip = String(data.ip || '').trim();
    if (cooldownSeconds > 0 && ip) {
      const since = nowSec() - cooldownSeconds;
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT id FROM bb_comment WHERE ip = ? AND created_at >= ? ORDER BY id DESC LIMIT 1',
        [ip, since],
      );
      if ((rows || []).length) {
        return { ok: false, message: `too fast (cooldown ${cooldownSeconds}s)` };
      }
    }

    const now = nowSec();
    const status = Number(settings.audit || 0) === 1 ? 0 : 1;
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO bb_comment (mid, rid, pid, user_id, name, content, ip, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.mid, data.rid, data.pid || 0, data.userId || 0, data.name || '', content, ip, status, now, now]
    );
    return { ok: true, id: result.insertId };
  }

  async digg(id: number, type: 'up' | 'down') {
    const field = type === 'up' ? 'digg_up' : 'digg_down';
    await this.pool.query(`UPDATE bb_comment SET ${field} = ${field} + 1 WHERE id = ?`, [id]);
    return { ok: true };
  }
}
