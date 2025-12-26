import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

export enum CollectType {
  VOD = 1,
  ARTICLE = 2,
  ACTOR = 3,
}

export interface CollectTemplateConfig {
  listUrl: string;
  detailUrl: string;
  pagination: {
    pageParam: string;
    pageStart: number;
  };
  fields: Record<string, {
    xpath: string;
    regex?: string;
    type?: 'string' | 'number' | 'array';
  }>;
}

export interface CollectTemplate {
  id: number;
  name: string;
  type: CollectType;
  description: string;
  config: CollectTemplateConfig;
  status: number;
  createdAt: number;
  updatedAt: number;
}

@Injectable()
export class CollectTemplateService {
  constructor(private readonly db: MySQLService) {}

  async listTemplates(type?: number) {
    const pool = this.db.getPool();
    let query = 'SELECT id, name, type, description, config, status, created_at, updated_at FROM bb_collect_template';
    const params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY type ASC, id DESC';

    const [rows] = await pool.query<any[]>(query, params);
    return {
      items: (rows || []).map(row => ({
        ...row,
        config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    };
  }

  async getTemplate(id: number): Promise<CollectTemplate> {
    const [rows] = await this.db.getPool().query<any[]>(
      'SELECT id, name, type, description, config, status, created_at, updated_at FROM bb_collect_template WHERE id = ?',
      [id],
    );

    const row = rows?.[0];
    if (!row) throw new NotFoundException('Template not found');

    return {
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createTemplate(input: {
    name: string;
    type: number;
    description?: string;
    config: CollectTemplateConfig;
    status?: number;
  }) {
    const name = String(input.name || '').trim();
    const type = Number(input.type);
    const description = String(input.description || '').trim();
    const config = input.config;
    const status = Number(input.status ?? 1) ? 1 : 0;

    if (!name) throw new BadRequestException('name required');
    if (!type || ![CollectType.VOD, CollectType.ARTICLE, CollectType.ACTOR].includes(type)) {
      throw new BadRequestException('invalid type');
    }
    if (!config) throw new BadRequestException('config required');

    const now = Math.floor(Date.now() / 1000);
    const [res] = await this.db.getPool().query(
      'INSERT INTO bb_collect_template (name, type, description, config, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, type, description, JSON.stringify(config), status, now, now],
    );

    return { ok: true, id: (res as any).insertId };
  }

  async updateTemplate(id: number, input: Partial<{
    name: string;
    description: string;
    config: CollectTemplateConfig;
    status: number;
  }>) {
    const template = await this.getTemplate(id);

    const name = input.name !== undefined ? String(input.name).trim() : template.name;
    const description = input.description !== undefined ? String(input.description).trim() : template.description;
    const config = input.config || template.config;
    const status = input.status !== undefined ? (Number(input.status) ? 1 : 0) : template.status;

    const now = Math.floor(Date.now() / 1000);
    await this.db.getPool().query(
      'UPDATE bb_collect_template SET name = ?, description = ?, config = ?, status = ?, updated_at = ? WHERE id = ?',
      [name, description, JSON.stringify(config), status, now, id],
    );

    return { ok: true };
  }

  async deleteTemplate(id: number) {
    const [res] = await this.db.getPool().query(
      'DELETE FROM bb_collect_template WHERE id = ?',
      [id],
    );

    return { ok: true, deleted: (res as any).affectedRows };
  }
}
