import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { MySQLService } from '../../db/mysql.service';
import { PublicVerifyService } from '../public/verify/public-verify.service';
import { ValidationException, AuthException } from '../../common/exceptions/app.exception';

@Injectable()
export class MemberAuthService {
  constructor(
    private readonly db: MySQLService,
    private readonly jwt: JwtService,
    private readonly verify: PublicVerifyService,
  ) {}

  async register(input: {
    username: string;
    password: string;
    email?: string;
    nickname?: string;
    verify?: string;
    verifyKey?: string;
  }) {
    const username = String(input.username || '').trim();
    const password = String(input.password || '').trim();
    const email = String(input.email || '').trim();
    const nickname = String(input.nickname || '').trim() || username;

    if (username.length < 3) throw new ValidationException('用户名至少3个字符');
    if (password.length < 6) throw new ValidationException('密码至少6个字符');

    // 验证码校验
    if (input.verifyKey && input.verify) {
      const valid = this.verify.verify(input.verifyKey, input.verify);
      if (!valid) throw new ValidationException('验证码错误');
    }

    const pool = await this.db.getPoolAsync();
    const [exists] = await pool.query<any[]>('SELECT id FROM bb_member WHERE username = ? LIMIT 1', [username]);
    if (exists?.[0]) throw new ValidationException('用户名已存在');

    const hash = await bcrypt.hash(password, 10);
    const now = Math.floor(Date.now() / 1000);
    const [groupRows] = await pool.query<any[]>(
      'SELECT id FROM bb_member_group WHERE status = 1 ORDER BY level ASC, id ASC LIMIT 1',
    );
    const groupId = Number(groupRows?.[0]?.id || 1);

    const [res] = await pool.query<any>(
      'INSERT INTO bb_member (group_id, username, nickname, password_hash, email, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
      [groupId, username, nickname, hash, email, 1, now, now],
    );

    // 注册成功后自动登录
    const token = await this.jwt.signAsync({
      sub: res.insertId,
      username,
      groupId,
      scope: 'member',
    });
    return { token };
  }

  async login(usernameRaw: string, passwordRaw: string, verifyCode?: string, verifyKey?: string) {
    const username = String(usernameRaw || '').trim();
    const password = String(passwordRaw || '').trim();

    // 验证码校验
    if (verifyKey && verifyCode) {
      const valid = this.verify.verify(verifyKey, verifyCode);
      if (!valid) throw new ValidationException('验证码错误');
    }

    const pool = await this.db.getPoolAsync();
    const [rows] = await pool.query<any[]>(
      'SELECT id, username, password_hash, group_id, status FROM bb_member WHERE username = ? LIMIT 1',
      [username],
    );
    const row = rows?.[0];
    if (!row || Number(row.status) !== 1) throw new AuthException('用户名或密码错误');

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) throw new AuthException('用户名或密码错误');

    // 更新登录时间
    const now = Math.floor(Date.now() / 1000);
    await pool.query('UPDATE bb_member SET login_time = ?, login_num = login_num + 1 WHERE id = ?', [now, row.id]);

    const token = await this.jwt.signAsync({
      sub: row.id,
      username: row.username,
      groupId: row.group_id,
      scope: 'member',
    });
    return { token };
  }
}
