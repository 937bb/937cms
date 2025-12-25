import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import * as crypto from 'crypto';
import { PublicVerifyService } from '../verify/public-verify.service';

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function md5(str: string) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function hashPassword(pwd: string, salt: string) {
  return md5(md5(pwd) + salt);
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

@Injectable()
export class PublicUserService {
  constructor(
    private readonly db: MySQLService,
    private readonly verify: PublicVerifyService,
  ) {}

  private async getUserSettings(): Promise<any> {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>("SELECT value_json FROM bb_setting WHERE `key` = 'user' LIMIT 1");
    const row = rows?.[0];
    if (!row) return {};
    try {
      return JSON.parse(row.value_json || '{}');
    } catch {
      return {};
    }
  }

  async register(input: { username: string; password: string; email?: string; verify?: string; verifyKey?: string }, ip: string) {
    const username = String(input.username || '').trim();
    const password = String(input.password || '');
    const email = String(input.email || '').trim();

    const userSettings = await this.getUserSettings();
    if ((userSettings.regVerify ?? 0) === 1) {
      const ok = this.verify.verify(String(input.verifyKey || ''), String(input.verify || ''));
      if (!ok) throw new BadRequestException('验证码错误');
    }

    if (username.length < 3 || username.length > 20) {
      throw new BadRequestException('用户名长度需要3-20个字符');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new BadRequestException('用户名只能包含字母、数字、下划线');
    }
    if (password.length < 6 || password.length > 32) {
      throw new BadRequestException('密码长度需要6-32个字符');
    }

    const pool = this.db.getPool();

    // 检查用户名是否存在
    const [exists] = await pool.query<any[]>('SELECT id FROM bb_member WHERE username = ? LIMIT 1', [username]);
    if (exists?.[0]) {
      throw new BadRequestException('用户名已存在');
    }

    // 检查邮箱是否存在
    if (email) {
      const [emailExists] = await pool.query<any[]>('SELECT id FROM bb_member WHERE email = ? LIMIT 1', [email]);
      if (emailExists?.[0]) {
        throw new BadRequestException('邮箱已被使用');
      }
    }

    // 获取默认会员组
    const [groups] = await pool.query<any[]>('SELECT id FROM bb_member_group WHERE status = 1 ORDER BY id ASC LIMIT 1');
    const groupId = groups?.[0]?.id || 1;

    const salt = generateSalt();
    const hashedPwd = hashPassword(password, salt);
    const t = nowSec();

    const [res] = await pool.query<any>(
      `INSERT INTO bb_member (group_id, username, password_hash, salt, email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [groupId, username, hashedPwd, salt, email, t, t],
    );

    return { ok: true, userId: res.insertId };
  }

  async login(input: { username: string; password: string; verify?: string; verifyKey?: string }, ip: string) {
    const username = String(input.username || '').trim();
    const password = String(input.password || '');

    if (!username || !password) {
      throw new BadRequestException('请输入用户名和密码');
    }

    const userSettings = await this.getUserSettings();
    if ((userSettings.loginVerify ?? 0) === 1) {
      if (!input.verify) throw new BadRequestException('请输入验证码');
      const ok = this.verify.verify(String(input.verifyKey || ''), String(input.verify || ''));
      if (!ok) throw new BadRequestException('验证码错误');
    }

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id, group_id, username, password_hash, salt, status FROM bb_member WHERE username = ? LIMIT 1',
      [username],
    );
    const user = rows?.[0];
    if (!user) {
      throw new BadRequestException('用户名或密码错误');
    }
    if (user.status !== 1) {
      throw new BadRequestException('账号已被禁用');
    }

    const hashedPwd = hashPassword(password, user.salt);
    if (hashedPwd !== user.password_hash) {
      throw new BadRequestException('用户名或密码错误');
    }

    // 生成 token
    const token = generateToken();
    const t = nowSec();
    const expireAt = t + 7 * 24 * 3600; // 7天有效期

    // 更新登录信息和 token
    await pool.query(
      `UPDATE bb_member SET token = ?, token_expire_at = ?, last_login_at = ?, last_login_ip = ?, login_count = login_count + 1, updated_at = ? WHERE id = ?`,
      [token, expireAt, t, ip, t, user.id],
    );

    return {
      token,
      expireAt,
      user: { id: user.id, username: user.username, groupId: user.group_id },
    };
  }

  async logout(token: string) {
    if (!token) return { ok: true };
    const pool = this.db.getPool();
    await pool.query('UPDATE bb_member SET token = NULL, token_expire_at = 0 WHERE token = ?', [token]);
    return { ok: true };
  }

  async validateToken(token: string) {
    if (!token) throw new UnauthorizedException('请先登录');
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id, group_id, username, nickname, email, avatar, qq, phone, points, points_used, expire_at, status FROM bb_member WHERE token = ? AND token_expire_at > ? LIMIT 1',
      [token, nowSec()],
    );
    const user = rows?.[0];
    if (!user) throw new UnauthorizedException('登录已过期，请重新登录');
    if (user.status !== 1) throw new UnauthorizedException('账号已被禁用');
    return user;
  }

  async getInfo(userId: number) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      `SELECT m.id, m.group_id, m.username, m.nickname, m.email, m.avatar, m.qq, m.phone, m.points, m.points_used, m.expire_at, m.last_login_at, m.login_count, m.created_at,
              g.name as group_name
       FROM bb_member m
       LEFT JOIN bb_member_group g ON g.id = m.group_id
       WHERE m.id = ? LIMIT 1`,
      [userId],
    );
    const user = rows?.[0];
    if (!user) return null;
    return {
      id: user.id,
      groupId: user.group_id,
      groupName: user.group_name || '',
      username: user.username,
      nickname: user.nickname || '',
      email: user.email || '',
      avatar: user.avatar || '',
      qq: user.qq || '',
      phone: user.phone || '',
      points: user.points || 0,
      pointsUsed: user.points_used || 0,
      expireAt: user.expire_at || 0,
      lastLoginAt: user.last_login_at || 0,
      loginCount: user.login_count || 0,
      createdAt: user.created_at || 0,
    };
  }

  async updateInfo(userId: number, input: { nickname?: string; qq?: string; phone?: string }) {
    const fields: string[] = [];
    const params: any[] = [];

    if (input.nickname !== undefined) {
      fields.push('nickname = ?');
      params.push(String(input.nickname || '').trim().slice(0, 30));
    }
    if (input.qq !== undefined) {
      fields.push('qq = ?');
      params.push(String(input.qq || '').trim().slice(0, 16));
    }
    if (input.phone !== undefined) {
      fields.push('phone = ?');
      params.push(String(input.phone || '').trim().slice(0, 16));
    }

    if (fields.length === 0) return { ok: true };

    fields.push('updated_at = ?');
    params.push(nowSec());
    params.push(userId);

    const pool = this.db.getPool();
    await pool.query(`UPDATE bb_member SET ${fields.join(', ')} WHERE id = ?`, params);
    return { ok: true };
  }

  async updatePassword(userId: number, input: { oldPassword: string; newPassword: string }) {
    const oldPwd = String(input.oldPassword || '');
    const newPwd = String(input.newPassword || '');

    if (!oldPwd || !newPwd) {
      throw new BadRequestException('请输入旧密码和新密码');
    }
    if (newPwd.length < 6 || newPwd.length > 32) {
      throw new BadRequestException('新密码长度需要6-32个字符');
    }

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SELECT password, salt FROM bb_member WHERE id = ? LIMIT 1', [userId]);
    const user = rows?.[0];
    if (!user) throw new BadRequestException('用户不存在');

    const hashedOld = hashPassword(oldPwd, user.salt);
    if (hashedOld !== user.password) {
      throw new BadRequestException('旧密码错误');
    }

    const newSalt = generateSalt();
    const hashedNew = hashPassword(newPwd, newSalt);

    await pool.query('UPDATE bb_member SET password = ?, salt = ?, updated_at = ? WHERE id = ?', [
      hashedNew,
      newSalt,
      nowSec(),
      userId,
    ]);

    return { ok: true };
  }

  // ========== 收藏/播放记录 ==========

  async listUlog(userId: number, type: number, page: number, pageSize: number) {
    const pool = this.db.getPool();
    const offset = (page - 1) * pageSize;

    const [countRows] = await pool.query<any[]>(
      'SELECT COUNT(*) as c FROM bb_ulog WHERE user_id = ? AND type = ?',
      [userId, type],
    );
    const total = Number(countRows?.[0]?.c || 0);

    const [rows] = await pool.query<any[]>(
      `SELECT u.id, u.mid, u.rid, u.sid, u.nid, u.points, u.created_at,
              v.vod_name, v.vod_pic, v.vod_remarks, t.type_name
       FROM bb_ulog u
       LEFT JOIN bb_vod v ON v.vod_id = u.rid AND u.mid = 1
       LEFT JOIN bb_type t ON t.type_id = v.type_id
       WHERE u.user_id = ? AND u.type = ?
       ORDER BY u.id DESC
       LIMIT ? OFFSET ?`,
      [userId, type, pageSize, offset],
    );

    return {
      page,
      pageSize,
      total,
      list: (rows || []).map((r) => ({
        id: r.id,
        mid: r.mid,
        rid: r.rid,
        sid: r.sid,
        nid: r.nid,
        points: r.points,
        createdAt: r.created_at,
        vodName: r.vod_name || '',
        vodPic: r.vod_pic || '',
        vodRemarks: r.vod_remarks || '',
        typeName: r.type_name || '',
      })),
    };
  }

  async addUlog(userId: number, input: { mid?: number; type: number; rid: number; sid?: number; nid?: number }) {
    const mid = Number(input.mid || 1);
    const type = Number(input.type);
    const rid = Number(input.rid);
    const sid = Number(input.sid || 0);
    const nid = Number(input.nid || 0);

    if (!rid) throw new BadRequestException('rid 不能为空');
    if (type !== 1 && type !== 2) throw new BadRequestException('type 无效');

    const pool = this.db.getPool();
    const t = nowSec();

    // 使用 REPLACE 实现更新或插入
    await pool.query(
      `INSERT INTO bb_ulog (user_id, mid, type, rid, sid, nid, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE sid = VALUES(sid), nid = VALUES(nid), created_at = VALUES(created_at)`,
      [userId, mid, type, rid, sid, nid, t],
    );

    return { ok: true };
  }

  async deleteUlog(userId: number, ids: number[]) {
    if (!ids.length) return { ok: true };
    const pool = this.db.getPool();
    await pool.query(`DELETE FROM bb_ulog WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`, [
      userId,
      ...ids,
    ]);
    return { ok: true };
  }

  async clearUlog(userId: number, type: number) {
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_ulog WHERE user_id = ? AND type = ?', [userId, type]);
    return { ok: true };
  }

  // ========== 忘记密码 ==========

  private emailCodeCache = new Map<string, { code: string; email: string; expireAt: number }>();

  async sendFindpassCode(email: string): Promise<{ ok: boolean; message: string }> {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('请输入有效的邮箱地址');
    }

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SELECT id FROM bb_member WHERE email = ? LIMIT 1', [email]);
    if (!rows?.[0]) {
      throw new BadRequestException('该邮箱未注册');
    }

    // 获取邮件配置
    const [settingRows] = await pool.query<any[]>("SELECT value_json FROM bb_setting WHERE `key` = 'email' LIMIT 1");
    const emailSettings = settingRows?.[0]?.value_json ? JSON.parse(settingRows[0].value_json) : {};
    if (!emailSettings.enabled) {
      throw new BadRequestException('邮件功能未启用');
    }

    // 生成验证码
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const key = crypto.randomBytes(16).toString('hex');
    this.emailCodeCache.set(key, { code, email, expireAt: nowSec() + 600 }); // 10分钟有效

    // 发送邮件
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: emailSettings.host,
        port: emailSettings.port || 465,
        secure: emailSettings.secure === 1,
        auth: { user: emailSettings.user, pass: emailSettings.pass },
      });

      const [siteRows] = await pool.query<any[]>("SELECT value_json FROM bb_setting WHERE `key` = 'site' LIMIT 1");
      const siteSettings = siteRows?.[0]?.value_json ? JSON.parse(siteRows[0].value_json) : {};
      const siteName = siteSettings.siteName || '937 CMS';

      const subject = (emailSettings.tpl?.findpassTitle || '找回密码 - {sitename}').replace('{sitename}', siteName);
      const text = (emailSettings.tpl?.findpassBody || '您的验证码是：{code}，有效期 {time} 分钟。')
        .replace('{code}', code)
        .replace('{time}', '10')
        .replace('{sitename}', siteName);

      await transporter.sendMail({
        from: emailSettings.nick ? `"${emailSettings.nick}" <${emailSettings.from || emailSettings.user}>` : (emailSettings.from || emailSettings.user),
        to: email,
        subject,
        text,
      });

      return { ok: true, message: '验证码已发送', key } as any;
    } catch (e: any) {
      throw new BadRequestException(`发送失败: ${e.message || e}`);
    }
  }

  async resetPasswordByCode(input: { key: string; code: string; newPassword: string }): Promise<{ ok: boolean }> {
    const { key, code, newPassword } = input;
    if (!key || !code) throw new BadRequestException('请输入验证码');
    if (!newPassword || newPassword.length < 6) throw new BadRequestException('新密码至少 6 位');

    const cached = this.emailCodeCache.get(key);
    if (!cached || cached.expireAt < nowSec()) {
      this.emailCodeCache.delete(key);
      throw new BadRequestException('验证码已过期');
    }
    if (cached.code !== code) {
      throw new BadRequestException('验证码错误');
    }

    const pool = this.db.getPool();
    const newSalt = generateSalt();
    const hashedNew = hashPassword(newPassword, newSalt);

    await pool.query('UPDATE bb_member SET password = ?, salt = ?, updated_at = ? WHERE email = ?', [
      hashedNew,
      newSalt,
      nowSec(),
      cached.email,
    ]);

    this.emailCodeCache.delete(key);
    return { ok: true };
  }
}
