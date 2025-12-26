import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

export interface ThemeConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'color' | 'select' | 'textarea' | 'array' | 'object' | 'image' | 'url' | 'json';
    label: string;
    description?: string;
    default?: any;
    required?: boolean;
    min?: number;
    max?: number;
    options?: Array<{ label: string; value: any }>;
    items?: any;
    properties?: any;
  };
}

export interface Theme {
  id: number;
  themeId: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage: string;
  repository: string;
  configSchema: ThemeConfigSchema;
  status: number;
  isActive: number;
  createdAt: number;
  updatedAt: number;
}

@Injectable()
export class ThemeManagementService {
  constructor(private readonly db: MySQLService) {}

  async listThemes() {
    const [rows] = await this.db.getPool().query<any[]>(
      `SELECT id, theme_id, name, version, description, author, homepage, repository,
              config_schema, status, is_active, created_at, updated_at
       FROM bb_theme ORDER BY is_active DESC, created_at DESC`,
    );

    return {
      items: (rows || []).map(row => ({
        id: row.id,
        themeId: row.theme_id,
        name: row.name,
        version: row.version,
        description: row.description,
        author: row.author,
        homepage: row.homepage,
        repository: row.repository,
        configSchema: typeof row.config_schema === 'string' ? JSON.parse(row.config_schema) : row.config_schema,
        status: row.status,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    };
  }

  async getTheme(themeId: string) {
    const [rows] = await this.db.getPool().query<any[]>(
      `SELECT id, theme_id, name, version, description, author, homepage, repository,
              config_schema, status, is_active, created_at, updated_at
       FROM bb_theme WHERE theme_id = ?`,
      [themeId],
    );

    const row = rows?.[0];
    if (!row) throw new NotFoundException('Theme not found');

    // 获取当前配置
    const [configRows] = await this.db.getPool().query<any[]>(
      `SELECT config_key, config_value FROM bb_theme_setting WHERE theme_id = ?`,
      [themeId],
    );

    const config: Record<string, any> = {};
    (configRows || []).forEach(row => {
      try {
        config[row.config_key] = JSON.parse(row.config_value);
      } catch {
        config[row.config_key] = row.config_value;
      }
    });

    return {
      id: row.id,
      themeId: row.theme_id,
      name: row.name,
      version: row.version,
      description: row.description,
      author: row.author,
      homepage: row.homepage,
      repository: row.repository,
      configSchema: typeof row.config_schema === 'string' ? JSON.parse(row.config_schema) : row.config_schema,
      config,
      status: row.status,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async installTheme(input: {
    themeId: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    homepage?: string;
    repository?: string;
    configSchema: ThemeConfigSchema;
  }) {
    const themeId = String(input.themeId || '').trim();
    const name = String(input.name || '').trim();
    const version = String(input.version || '').trim();

    if (!themeId) throw new BadRequestException('themeId required');
    if (!name) throw new BadRequestException('name required');
    if (!version) throw new BadRequestException('version required');

    const now = Math.floor(Date.now() / 1000);

    // 检查是否已存在
    const [existing] = await this.db.getPool().query<any[]>(
      'SELECT id FROM bb_theme WHERE theme_id = ?',
      [themeId],
    );

    if (existing?.length) {
      // 更新现有主题
      await this.db.getPool().query(
        `UPDATE bb_theme SET name = ?, version = ?, description = ?, author = ?,
                homepage = ?, repository = ?, config_schema = ?, updated_at = ?
         WHERE theme_id = ?`,
        [
          name,
          version,
          input.description || '',
          input.author || '',
          input.homepage || '',
          input.repository || '',
          JSON.stringify(input.configSchema),
          now,
          themeId,
        ],
      );
      return { ok: true, themeId, message: 'Theme updated' };
    }

    // 新增主题
    await this.db.getPool().query(
      `INSERT INTO bb_theme (theme_id, name, version, description, author, homepage, repository, config_schema, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        themeId,
        name,
        version,
        input.description || '',
        input.author || '',
        input.homepage || '',
        input.repository || '',
        JSON.stringify(input.configSchema),
        now,
        now,
      ],
    );

    return { ok: true, themeId, message: 'Theme installed' };
  }

  async updateThemeConfig(themeId: string, config: Record<string, any>) {
    const theme = await this.getTheme(themeId);
    const now = Math.floor(Date.now() / 1000);
    const pool = this.db.getPool();

    // 删除旧配置
    await pool.query('DELETE FROM bb_theme_setting WHERE theme_id = ?', [themeId]);

    // 插入新配置
    for (const [key, value] of Object.entries(config)) {
      await pool.query(
        `INSERT INTO bb_theme_setting (theme_id, config_key, config_value, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [themeId, key, JSON.stringify(value), now, now],
      );
    }

    return { ok: true, message: 'Config updated' };
  }

  async activateTheme(themeId: string) {
    const theme = await this.getTheme(themeId);
    const pool = this.db.getPool();
    const now = Math.floor(Date.now() / 1000);

    // 取消其他主题的激活状态
    await pool.query('UPDATE bb_theme SET is_active = 0, updated_at = ?', [now]);

    // 激活指定主题
    await pool.query('UPDATE bb_theme SET is_active = 1, updated_at = ? WHERE theme_id = ?', [now, themeId]);

    return { ok: true, message: 'Theme activated' };
  }

  async deleteTheme(themeId: string) {
    const theme = await this.getTheme(themeId);

    if (theme.isActive) {
      throw new BadRequestException('Cannot delete active theme');
    }

    const pool = this.db.getPool();

    // 删除配置
    await pool.query('DELETE FROM bb_theme_setting WHERE theme_id = ?', [themeId]);

    // 删除主题
    await pool.query('DELETE FROM bb_theme WHERE theme_id = ?', [themeId]);

    return { ok: true, message: 'Theme deleted' };
  }

  async getActiveThemeConfig() {
    const [rows] = await this.db.getPool().query<any[]>(
      `SELECT t.theme_id, t.config_schema
       FROM bb_theme t WHERE t.is_active = 1 LIMIT 1`,
    );

    const theme = rows?.[0];
    if (!theme) throw new NotFoundException('No active theme');

    // 获取配置
    const [configRows] = await this.db.getPool().query<any[]>(
      `SELECT config_key, config_value FROM bb_theme_setting WHERE theme_id = ?`,
      [theme.theme_id],
    );

    const config: Record<string, any> = {};
    (configRows || []).forEach(row => {
      try {
        config[row.config_key] = JSON.parse(row.config_value);
      } catch {
        config[row.config_key] = row.config_value;
      }
    });

    return {
      themeId: theme.theme_id,
      config,
    };
  }
}
