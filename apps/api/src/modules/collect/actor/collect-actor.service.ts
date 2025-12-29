import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

export interface ActorData {
  source_id: number;
  actor_name: string;
  actor_pic?: string;
  actor_area?: string;
  actor_sex?: number;
  actor_status?: number;
}

@Injectable()
export class CollectActorService {
  constructor(private readonly db: MySQLService) {}

  /**
   * 采集演员
   * @param sourceId 采集源 ID
   * @param templateId 采集模板 ID
   */
  async collectActors(sourceId: number, templateId: number) {
    // TODO: 实现演员采集逻辑
    // 1. 获取模板配置
    // 2. 获取演员列表
    // 3. 解析演员信息
    // 4. 入库到 bb_actor

    return {
      ok: true,
      collected: 0,
      message: 'Actor collection not implemented yet',
    };
  }

  /**
   * 入库演员
   */
  async receiveActor(data: ActorData) {
    const now = Math.floor(Date.now() / 1000);
    const pool = this.db.getPool();

    const [res] = await pool.query(
      `INSERT INTO bb_actor
       (actor_name, actor_pic, actor_area, actor_sex, actor_status, actor_time_add, actor_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.actor_name,
        data.actor_pic || '',
        data.actor_area || '',
        data.actor_sex || 0,
        data.actor_status || 1,
        now,
        now,
      ],
    );

    return {
      ok: true,
      actor_id: (res as any).insertId,
    };
  }
}
