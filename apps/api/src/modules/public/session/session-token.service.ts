import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import * as crypto from 'crypto';
import type { RowDataPacket } from 'mysql2/promise';

@Injectable()
export class SessionTokenService {
  constructor(private readonly db: MySQLService) {}

  private get pool() {
    return this.db.getPool();
  }

  /**
   * 获取会话 Token 配置
   */
  async getConfig() {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT * FROM bb_session_token_config LIMIT 1'
    );
    return rows[0] || { enabled: 0, ttl: 7200 };
  }

  /**
   * 获取 API Key 记录
   */
  async getApiKeyRecord(apiKey: string): Promise<RowDataPacket | null> {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT * FROM bb_api_key WHERE `key` = ? AND enabled = 1 LIMIT 1',
        [apiKey]
      );
      return rows[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 验证 API Key
   */
  async verifyApiKey(apiKey: string, clientIp?: string): Promise<boolean> {
    try {
      const apiKeyRecord = await this.getApiKeyRecord(apiKey);

      if (!apiKeyRecord) {
        return false;
      }


      // 检查 IP 限制
      if (apiKeyRecord.ip_limit && clientIp) {
        const allowedIps = apiKeyRecord.ip_limit
          .split(',')
          .map((ip: string) => ip.trim());
        if (!allowedIps.includes(clientIp)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 生成会话 Token
   * 每次生成新 Token 时，删除该 API Key 的旧 Token
   */
  async generateToken(apiKeyId: number): Promise<string> {
    const config = await this.getConfig();

    if (!config.enabled) {
      throw new Error('Session token is disabled');
    }

    // 删除该 API Key 的旧 Token
    await this.pool.query(
      'DELETE FROM bb_session_token WHERE api_key_id = ?',
      [apiKeyId]
    );

    // 生成随机 token
    const randomToken = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();

    // 构建 token 数据
    const tokenData = {
      random: randomToken,
      timestamp,
    };

    // 加密 token
    const encryptedToken = this.encryptToken(tokenData);

    // 设置过期时间为 10 年后
    const expiresAt = new Date(timestamp + 10 * 365 * 24 * 60 * 60 * 1000);
    // 格式化为 MySQL datetime 格式 (YYYY-MM-DD HH:mm:ss)
    const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    // 保存到数据库
    await this.pool.query(
      'INSERT INTO bb_session_token (token, api_key_id, expires_at) VALUES (?, ?, ?)',
      [encryptedToken, apiKeyId, expiresAtStr]
    );

    return encryptedToken;
  }

  /**
   * 验证会话 Token
   * 只验证 Token 是否存在和有效
   */
  async verifyToken(token: string): Promise<boolean> {
    const config = await this.getConfig();

    if (!config.enabled) {
      return true; // 功能关闭，允许所有请求
    }

    try {
      // 查询 token
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT * FROM bb_session_token WHERE token = ? LIMIT 1',
        [token]
      );

      if (rows.length === 0) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 绑定 Token 到客户端 IP 和 User-Agent
   * 在客户端首次请求时调用，记录客户端的 IP 和 User-Agent
   */
  async bindTokenToClient(token: string, ip?: string, userAgent?: string): Promise<boolean> {
    const config = await this.getConfig();

    if (!config.enabled) {
      return true;
    }

    try {
      await this.pool.query(
        'UPDATE bb_session_token SET ip = ?, user_agent = ? WHERE token = ?',
        [ip || '', userAgent || '', token]
      );

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 加密 token
   */
  private encryptToken(data: any): string {
    const key = process.env.SESSION_TOKEN_SECRET || 'default-secret-key-change-me';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32, '0').slice(0, 32)), iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * 清理过期 token
   */
  async cleanupExpiredTokens() {
    await this.pool.query('DELETE FROM bb_session_token WHERE expires_at < NOW()');
  }
}
