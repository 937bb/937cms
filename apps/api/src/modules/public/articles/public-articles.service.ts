import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import type { RowDataPacket } from 'mysql2/promise';

@Injectable()
export class PublicArticlesService {
  constructor(private readonly db: MySQLService) {}

  private get pool() {
    return this.db.getPool();
  }

  async list(query: {
    page?: number;
    pageSize?: number;
    typeId?: number;
    keyword?: string;
    sort?: string;
    order?: string;
  }) {
    const { page = 1, pageSize = 20, typeId, keyword, sort = 'id', order = 'desc' } = query;
    const offset = (page - 1) * pageSize;

    let where = 'status = 1';
    const params: any[] = [];

    if (typeId) {
      where += ' AND (type_id = ? OR type_id_1 = ?)';
      params.push(typeId, typeId);
    }
    if (keyword) {
      where += ' AND (name LIKE ? OR tag LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const allowedSort = ['id', 'hits', 'created_at', 'score'];
    const sortField = allowedSort.includes(sort) ? sort : 'id';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const [[{ total }]] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM bb_article WHERE ${where}`,
      params
    );

    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id, type_id, type_id_1, name, pic, author, source, tag, blurb, hits, score, created_at
       FROM bb_article WHERE ${where} ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { page, pageSize, total, list: rows };
  }

  async detail(id: number) {
    // 增加点击量
    await this.pool.query('UPDATE bb_article SET hits = hits + 1 WHERE id = ?', [id]);

    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id, type_id, type_id_1, name, sub, pic, pic_thumb, author, source, tag, blurb, remarks,
              content, level, hits, up, down, score, score_all, score_num, created_at, updated_at
       FROM bb_article WHERE id = ? AND status = 1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }
}
