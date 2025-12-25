import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import * as crypto from 'crypto';

export type ApiKey = {
  id: number;
  key: string;
  name: string;
  remark?: string;
  ip_limit?: string;
  enabled: number;
  created_at: number;
  updated_at: number;
  last_used_at?: number;
};

@Injectable()
export class ApiKeyService {
  constructor(private readonly db: MySQLService) {}

  /**
   * 生成新的 API Key
   */
  generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 创建 API Key
   */
  async create(name: string, remark?: string, ip_limit?: string): Promise<ApiKey> {
    const pool = this.db.getPool();
    const key = this.generateKey();
    const now = Math.floor(Date.now() / 1000);

    await pool.query(
      'INSERT INTO bb_api_key (`key`, name, remark, ip_limit, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [key, name, remark || null, ip_limit || null, 1, now, now],
    );

    return this.getByKey(key) as Promise<ApiKey>;
  }

  /**
   * 获取 API Key
   */
  async getByKey(key: string): Promise<ApiKey | null> {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM bb_api_key WHERE `key` = ? LIMIT 1',
      [key],
    );
    return rows?.[0] || null;
  }

  /**
   * 获取所有 API Key
   */
  async getAll(): Promise<ApiKey[]> {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM bb_api_key ORDER BY created_at DESC',
    );
    return rows || [];
  }

  /**
   * 更新 API Key
   */
  async update(id: number, data: Partial<Omit<ApiKey, 'id' | 'key' | 'created_at'>>): Promise<void> {
    const pool = this.db.getPool();
    const now = Math.floor(Date.now() / 1000);
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.remark !== undefined) {
      updates.push('remark = ?');
      values.push(data.remark);
    }
    if (data.ip_limit !== undefined) {
      updates.push('ip_limit = ?');
      values.push(data.ip_limit);
    }
    if (data.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(data.enabled);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await pool.query(
      `UPDATE bb_api_key SET ${updates.join(', ')} WHERE id = ?`,
      values,
    );
  }

  /**
   * 删除 API Key
   */
  async delete(id: number): Promise<void> {
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_api_key WHERE id = ?', [id]);
  }

  /**
   * 更新最后使用时间
   */
  async updateLastUsed(key: string): Promise<void> {
    const pool = this.db.getPool();
    const now = Math.floor(Date.now() / 1000);
    await pool.query(
      'UPDATE bb_api_key SET last_used_at = ? WHERE `key` = ?',
      [now, key],
    );
  }
}
