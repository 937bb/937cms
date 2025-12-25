import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../db/mysql.service';

@Injectable()
export class MemberUserService {
  constructor(private readonly db: MySQLService) {}

  async getInfo(userId: number) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      `SELECT m.id, m.username, m.nickname, m.email, m.avatar, m.points, m.created_at as createdAt,
              g.name as groupName, g.level as groupLevel
       FROM bb_member m
       LEFT JOIN bb_member_group g ON m.group_id = g.id
       WHERE m.id = ?`,
      [userId],
    );
    return rows?.[0] || null;
  }

  async updateInfo(userId: number, data: { nickname?: string; email?: string; avatar?: string }) {
    const pool = this.db.getPool();
    const sets: string[] = [];
    const params: any[] = [];

    if (data.nickname !== undefined) {
      sets.push('nickname = ?');
      params.push(data.nickname);
    }
    if (data.email !== undefined) {
      sets.push('email = ?');
      params.push(data.email);
    }
    if (data.avatar !== undefined) {
      sets.push('avatar = ?');
      params.push(data.avatar);
    }

    if (sets.length === 0) return { ok: true };

    sets.push('updated_at = ?');
    params.push(Math.floor(Date.now() / 1000));
    params.push(userId);

    await pool.query(`UPDATE bb_member SET ${sets.join(', ')} WHERE id = ?`, params);
    return { ok: true };
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const pool = this.db.getPool();
    const bcrypt = await import('bcryptjs');

    const [rows] = await pool.query<any[]>('SELECT password_hash FROM bb_member WHERE id = ?', [userId]);
    if (!rows?.[0]) throw new Error('用户不存在');

    const valid = await bcrypt.compare(oldPassword, rows[0].password_hash);
    if (!valid) throw new Error('原密码错误');

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE bb_member SET password_hash = ?, updated_at = ? WHERE id = ?', [
      hash,
      Math.floor(Date.now() / 1000),
      userId,
    ]);
    return { ok: true };
  }

  // 收藏列表
  async getFavorites(userId: number, page = 1, pageSize = 20) {
    const pool = this.db.getPool();
    const offset = (page - 1) * pageSize;

    const [countRows] = await pool.query<any[]>(
      'SELECT COUNT(*) as cnt FROM bb_member_favorite WHERE member_id = ?',
      [userId],
    );
    const total = Number(countRows?.[0]?.cnt || 0);

    const [rows] = await pool.query<any[]>(
      `SELECT f.id, f.vod_id, f.created_at, v.vod_name, v.vod_pic, v.vod_remarks, v.vod_year, t.name as type_name
       FROM bb_member_favorite f
       LEFT JOIN bb_vod v ON f.vod_id = v.vod_id
       LEFT JOIN bb_type t ON v.type_id = t.id
       WHERE f.member_id = ?
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset],
    );

    return { items: rows || [], total, page, pageSize };
  }

  // 添加收藏
  async addFavorite(userId: number, vodId: number) {
    const pool = this.db.getPool();
    const now = Math.floor(Date.now() / 1000);

    // 检查是否已收藏
    const [exists] = await pool.query<any[]>(
      'SELECT id FROM bb_member_favorite WHERE member_id = ? AND vod_id = ?',
      [userId, vodId],
    );
    if (exists?.[0]) return { ok: true, message: '已收藏' };

    await pool.query(
      'INSERT INTO bb_member_favorite (member_id, vod_id, created_at) VALUES (?, ?, ?)',
      [userId, vodId, now],
    );
    return { ok: true };
  }

  // 删除收藏
  async removeFavorite(userId: number, vodId: number) {
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_member_favorite WHERE member_id = ? AND vod_id = ?', [userId, vodId]);
    return { ok: true };
  }

  // 检查是否已收藏
  async isFavorite(userId: number, vodId: number) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id FROM bb_member_favorite WHERE member_id = ? AND vod_id = ?',
      [userId, vodId],
    );
    return { isFavorite: !!rows?.[0] };
  }

  // 播放历史
  async getPlayHistory(userId: number, page = 1, pageSize = 20) {
    const pool = this.db.getPool();
    const offset = (page - 1) * pageSize;

    const [countRows] = await pool.query<any[]>(
      'SELECT COUNT(*) as cnt FROM bb_member_play_history WHERE member_id = ?',
      [userId],
    );
    const total = Number(countRows?.[0]?.cnt || 0);

    const [rows] = await pool.query<any[]>(
      `SELECT h.id, h.vod_id, h.episode_index, h.play_time, h.updated_at,
              v.vod_name, v.vod_pic, v.vod_remarks, t.name as type_name
       FROM bb_member_play_history h
       LEFT JOIN bb_vod v ON h.vod_id = v.vod_id
       LEFT JOIN bb_type t ON v.type_id = t.id
       WHERE h.member_id = ?
       ORDER BY h.updated_at DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset],
    );

    return { items: rows || [], total, page, pageSize };
  }

  // 记录播放历史
  async recordPlayHistory(userId: number, vodId: number, episodeIndex: number, playTime: number) {
    const pool = this.db.getPool();
    const now = Math.floor(Date.now() / 1000);

    // 检查是否已有记录
    const [exists] = await pool.query<any[]>(
      'SELECT id FROM bb_member_play_history WHERE member_id = ? AND vod_id = ?',
      [userId, vodId],
    );

    if (exists?.[0]) {
      await pool.query(
        'UPDATE bb_member_play_history SET episode_index = ?, play_time = ?, updated_at = ? WHERE id = ?',
        [episodeIndex, playTime, now, exists[0].id],
      );
    } else {
      await pool.query(
        'INSERT INTO bb_member_play_history (member_id, vod_id, episode_index, play_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, vodId, episodeIndex, playTime, now, now],
      );
    }
    return { ok: true };
  }

  // 删除播放历史
  async removePlayHistory(userId: number, vodId?: number) {
    const pool = this.db.getPool();
    if (vodId) {
      await pool.query('DELETE FROM bb_member_play_history WHERE member_id = ? AND vod_id = ?', [userId, vodId]);
    } else {
      await pool.query('DELETE FROM bb_member_play_history WHERE member_id = ?', [userId]);
    }
    return { ok: true };
  }

  // 按 ID 删除收藏
  async removeFavoriteById(userId: number, id: number) {
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_member_favorite WHERE member_id = ? AND id = ?', [userId, id]);
    return { ok: true };
  }

  // 清空收藏
  async clearFavorites(userId: number) {
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_member_favorite WHERE member_id = ?', [userId]);
    return { ok: true };
  }

  // 按 ID 删除播放历史
  async removePlayHistoryById(userId: number, id: number) {
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_member_play_history WHERE member_id = ? AND id = ?', [userId, id]);
    return { ok: true };
  }

  // 清空播放历史
  async clearPlayHistory(userId: number) {
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_member_play_history WHERE member_id = ?', [userId]);
    return { ok: true };
  }
}
