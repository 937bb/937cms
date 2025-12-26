import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import AdmZip = require('adm-zip');
import * as fs from 'fs';
import * as path from 'path';

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

    // 从 JSON 文件获取配置
    const config = await this.getThemeConfigFromFile(themeId);

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
    // 直接保存到 JSON 文件
    return this.saveThemeConfigToFile(themeId, config);
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
      `SELECT t.theme_id, t.name, t.config_schema
       FROM bb_theme t WHERE t.is_active = 1 LIMIT 1`,
    );

    const theme = rows?.[0];
    if (!theme) throw new NotFoundException('No active theme');

    const config = await this.getThemeConfigFromFile(theme.theme_id);

    return {
      themeId: theme.theme_id,
      name: theme.name,
      configSchema: typeof theme.config_schema === 'string' ? JSON.parse(theme.config_schema) : theme.config_schema,
      config,
    };
  }

  async installThemePackage(file: Express.Multer.File) {
    const zip = new AdmZip(file.buffer);

    const themeJsonEntry = zip.getEntry('theme.json');
    if (!themeJsonEntry) {
      throw new BadRequestException('theme.json not found in ZIP');
    }

    const themeConfig = JSON.parse(themeJsonEntry.getData().toString('utf8'));
    const themeId = themeConfig.themeId;

    // 使用项目根目录的data/themes目录，避免编译时丢失
    const projectRoot = path.join(__dirname, '../../../../..');
    const themePath = path.join(projectRoot, 'data/themes', themeId);

    if (!fs.existsSync(path.dirname(themePath))) {
      fs.mkdirSync(path.dirname(themePath), { recursive: true });
    }
    zip.extractAllTo(themePath, true);

    await this.installTheme(themeConfig);

    return { ok: true, themeId, message: 'Theme package installed' };
  }

  async getThemeConfigFromFile(themeId: string) {
    const projectRoot = path.join(__dirname, '../../../../..');
    const configPath = path.join(projectRoot, 'data/themes', themeId, 'config.json');
    if (!fs.existsSync(configPath)) {
      return {};
    }
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  }

  async saveThemeConfigToFile(themeId: string, config: Record<string, any>) {
    const projectRoot = path.join(__dirname, '../../../../..');
    const configPath = path.join(projectRoot, 'data/themes', themeId, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return { ok: true, message: 'Config saved' };
  }

  async uploadThemeImage(themeId: string, file: Express.Multer.File) {
    const projectRoot = path.join(__dirname, '../../../../..');
    const imagesDir = path.join(projectRoot, 'data/uploads/theme', themeId);

    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filePath = path.join(imagesDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const url = `/uploads/theme/${themeId}/${filename}`;
    return { ok: true, url, message: 'Image uploaded' };
  }

  async getThemeConfigPage(themeId: string) {
    const projectRoot = path.join(__dirname, '../../../../..');
    const htmlPath = path.join(projectRoot, 'data/themes', themeId, 'config.html');
    if (!fs.existsSync(htmlPath)) {
      throw new NotFoundException('Config page not found');
    }
    return fs.readFileSync(htmlPath, 'utf8');
  }
}
