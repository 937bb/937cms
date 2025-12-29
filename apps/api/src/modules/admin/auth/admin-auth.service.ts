import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { MySQLService } from '../../../db/mysql.service';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly db: MySQLService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id, username, password_hash, role FROM bb_admin WHERE username = ? LIMIT 1',
      [username],
    );
    const admin = rows?.[0];
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const accessToken = await this.jwt.signAsync({
      sub: admin.id,
      username: admin.username,
      role: admin.role,
    });
    return { accessToken };
  }

  async list() {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id, username, role, created_at, updated_at FROM bb_admin ORDER BY id ASC',
    );
    return { items: rows || [] };
  }

  async create(input: { username: string; password: string; role?: string }) {
    const username = String(input.username || '').trim();
    const password = String(input.password || '').trim();
    const role = String(input.role || 'admin').trim();

    if (username.length < 3) throw new BadRequestException('用户名至少 3 位');
    if (password.length < 6) throw new BadRequestException('密码至少 6 位');

    const pool = this.db.getPool();
    const [exists] = await pool.query<any[]>('SELECT id FROM bb_admin WHERE username = ? LIMIT 1', [username]);
    if (exists?.[0]) throw new BadRequestException('用户名已存在');

    const hash = await bcrypt.hash(password, 10);
    const now = Math.floor(Date.now() / 1000);
    const [res] = await pool.query<any>(
      'INSERT INTO bb_admin (username, password_hash, role, created_at, updated_at) VALUES (?,?,?,?,?)',
      [username, hash, role, now, now],
    );
    return { ok: true, id: res.insertId };
  }

  async updatePassword(id: number, oldPassword: string, newPassword: string) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SELECT password_hash FROM bb_admin WHERE id = ? LIMIT 1', [id]);
    const admin = rows?.[0];
    if (!admin) throw new BadRequestException('管理员不存在');

    const ok = await bcrypt.compare(oldPassword, admin.password_hash);
    if (!ok) throw new BadRequestException('原密码错误');

    if (newPassword.length < 6) throw new BadRequestException('新密码至少 6 位');
    const hash = await bcrypt.hash(newPassword, 10);
    const now = Math.floor(Date.now() / 1000);
    await pool.query('UPDATE bb_admin SET password_hash = ?, updated_at = ? WHERE id = ?', [hash, now, id]);
    return { ok: true };
  }

  async resetPassword(id: number, newPassword: string) {
    if (newPassword.length < 6) throw new BadRequestException('新密码至少 6 位');
    const pool = this.db.getPool();
    const hash = await bcrypt.hash(newPassword, 10);
    const now = Math.floor(Date.now() / 1000);
    await pool.query('UPDATE bb_admin SET password_hash = ?, updated_at = ? WHERE id = ?', [hash, now, id]);
    return { ok: true };
  }

  async delete(id: number) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SELECT COUNT(*) as cnt FROM bb_admin');
    if (Number(rows?.[0]?.cnt || 0) <= 1) throw new BadRequestException('至少保留一个管理员');
    await pool.query('DELETE FROM bb_admin WHERE id = ?', [id]);
    return { ok: true };
  }
}
