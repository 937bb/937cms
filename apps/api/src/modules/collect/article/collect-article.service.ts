import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

export interface ArticleData {
  source_id: number;
  article_title: string;
  article_content: string;
  article_pic?: string;
  article_time?: number;
  article_status?: number;
}

@Injectable()
export class CollectArticleService {
  constructor(private readonly db: MySQLService) {}

  /**
   * 采集资讯
   * @param sourceId 采集源 ID
   * @param templateId 采集模板 ID
   */
  async collectArticles(sourceId: number, templateId: number) {
    // TODO: 实现资讯采集逻辑
    // 1. 获取模板配置
    // 2. 获取列表页数据
    // 3. 解析文章列表
    // 4. 逐个采集详情
    // 5. 入库到 bb_article

    return {
      ok: true,
      collected: 0,
      message: 'Article collection not implemented yet',
    };
  }

  /**
   * 入库资讯
   */
  async receiveArticle(data: ArticleData) {
    const now = Math.floor(Date.now() / 1000);
    const pool = this.db.getPool();

    const [res] = await pool.query(
      `INSERT INTO bb_article
       (article_title, article_content, article_pic, article_time, article_status, article_time_add, article_time_update)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.article_title,
        data.article_content,
        data.article_pic || '',
        data.article_time || now,
        data.article_status || 1,
        now,
        now,
      ],
    );

    return {
      ok: true,
      article_id: (res as any).insertId,
    };
  }
}
