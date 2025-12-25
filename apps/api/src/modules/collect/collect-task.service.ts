import { Injectable, BadRequestException } from '@nestjs/common';
import { MySQLService } from '../../db/mysql.service';

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

@Injectable()
export class CollectTaskService {
  constructor(private readonly db: MySQLService) {}

  /**
   * 为采集运行创建任务（支持多线路）
   * 每个线路（source）创建一个独立的任务，支持并发采集
   */
  async createTasksForRun(runId: number, sourceIds: number[]) {
    if (!runId || !sourceIds.length) return { ok: true, created: 0 };

    const pool = this.db.getPool();
    const t = nowSec();
    const values = sourceIds.map((sourceId) => [runId, sourceId, 0, t, t]);

    const [res] = await pool.query<any>(
      'INSERT IGNORE INTO bb_collect_task (run_id, source_id, status, created_at, updated_at) VALUES ?',
      [values],
    );

    return { ok: true, created: Number(res?.affectedRows || 0) };
  }

  /**
   * 获取待处理的采集任务（支持多线路并发）
   */
  async getNextPendingTask(): Promise<{
    ok: boolean;
    task: { id: number; run_id: number; source_id: number; source: any } | null;
  }> {
    const pool = this.db.getPool();
    const conn = await pool.getConnection();

    let task: any = null;
    const t = nowSec();

    try {
      await conn.beginTransaction();

      // 获取最早的待处理任务
      const [rows] = await conn.query<any[]>(
        'SELECT id, run_id, source_id FROM bb_collect_task WHERE status = 0 ORDER BY id ASC LIMIT 1 FOR UPDATE',
      );

      if (!rows?.[0]) {
        await conn.commit();
        return { ok: true, task: null };
      }

      task = rows[0];
      const taskId = Number(task.id);

      // 更新任务状态为运行中
      await conn.query('UPDATE bb_collect_task SET status = 1, started_at = ?, updated_at = ? WHERE id = ?', [
        t,
        t,
        taskId,
      ]);

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    if (!task) return { ok: true, task: null };

    // 获取采集源信息
    const [srcRows] = await pool.query<any[]>(
      'SELECT id, name, base_url, collect_type FROM bb_collect_source WHERE id = ? LIMIT 1',
      [task.source_id],
    );

    const source = srcRows?.[0] || null;

    return {
      ok: true,
      task: {
        id: Number(task.id),
        run_id: Number(task.run_id),
        source_id: Number(task.source_id),
        source,
      },
    };
  }

  /**
   * 更新采集任务进度
   */
  async updateTaskProgress(input: {
    taskId: number;
    currentPage?: number;
    totalPages?: number;
    createdCount?: number;
    updatedCount?: number;
    errorCount?: number;
  }) {
    const taskId = Number(input.taskId);
    if (!taskId) throw new BadRequestException('taskId invalid');

    const pool = this.db.getPool();
    const fields: string[] = [];
    const params: any[] = [];

    if (input.currentPage !== undefined) {
      fields.push('current_page = ?');
      params.push(Math.max(1, Number(input.currentPage) || 1));
    }

    if (input.totalPages !== undefined) {
      fields.push('total_pages = ?');
      params.push(Math.max(0, Number(input.totalPages) || 0));
    }

    if (input.createdCount !== undefined) {
      fields.push('created_count = ?');
      params.push(Math.max(0, Number(input.createdCount) || 0));
    }

    if (input.updatedCount !== undefined) {
      fields.push('updated_count = ?');
      params.push(Math.max(0, Number(input.updatedCount) || 0));
    }

    if (input.errorCount !== undefined) {
      fields.push('error_count = ?');
      params.push(Math.max(0, Number(input.errorCount) || 0));
    }

    fields.push('updated_at = ?');
    params.push(nowSec());
    params.push(taskId);

    await pool.query(`UPDATE bb_collect_task SET ${fields.join(', ')} WHERE id = ?`, params);

    return { ok: true };
  }

  /**
   * 完成采集任务
   */
  async completeTask(taskId: number, status: 2 | 3, errorMessage?: string) {
    if (!taskId) throw new BadRequestException('taskId invalid');

    const pool = this.db.getPool();
    const t = nowSec();

    const fields = ['status = ?', 'finished_at = ?', 'updated_at = ?'];
    const params: any[] = [status, t, t];

    if (errorMessage) {
      fields.push('error_message = ?');
      params.push(String(errorMessage || '').slice(0, 500));
    }

    params.push(taskId);

    await pool.query(`UPDATE bb_collect_task SET ${fields.join(', ')} WHERE id = ?`, params);

    return { ok: true };
  }

  /**
   * 记录采集的资源，避免重复
   */
  async recordCollectedItem(input: {
    taskId: number;
    sourceId: number;
    remoteId: string;
    localId?: number;
    isNew: boolean;
  }) {
    const pool = this.db.getPool();
    const t = nowSec();

    const [res] = await pool.query<any>(
      `INSERT INTO bb_collect_record (task_id, source_id, remote_id, local_id, is_new, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE local_id = ?, is_new = ?, created_at = ?`,
      [
        input.taskId,
        input.sourceId,
        input.remoteId,
        input.localId || null,
        input.isNew ? 1 : 0,
        t,
        input.localId || null,
        input.isNew ? 1 : 0,
        t,
      ],
    );

    return { ok: true, isNew: Number(res?.affectedRows || 0) > 0 };
  }

  /**
   * 检查资源是否已采集
   */
  async checkRecordExists(sourceId: number, remoteId: string) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id FROM bb_collect_record WHERE source_id = ? AND remote_id = ? LIMIT 1',
      [sourceId, remoteId],
    );
    return Boolean(rows?.[0]?.id);
  }

  /**
   * 获取采集任务统计
   */
  async getTaskStats(runId: number) {
    const pool = this.db.getPool();

    const [rows] = await pool.query<any[]>(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as running_tasks,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as failed_tasks,
        SUM(created_count) as total_created,
        SUM(updated_count) as total_updated,
        SUM(error_count) as total_errors
       FROM bb_collect_task
       WHERE run_id = ?`,
      [runId],
    );

    const stats = rows?.[0] || {};

    return {
      ok: true,
      stats: {
        totalTasks: Number(stats.total_tasks || 0),
        pendingTasks: Number(stats.pending_tasks || 0),
        runningTasks: Number(stats.running_tasks || 0),
        completedTasks: Number(stats.completed_tasks || 0),
        failedTasks: Number(stats.failed_tasks || 0),
        totalCreated: Number(stats.total_created || 0),
        totalUpdated: Number(stats.total_updated || 0),
        totalErrors: Number(stats.total_errors || 0),
      },
    };
  }

  /**
   * 获取采集任务列表
   */
  async listTasks(input: { runId?: number; sourceId?: number; status?: number; page: number; pageSize: number }) {
    const page = Math.max(1, Number(input.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(input.pageSize || 20)));

    const where: string[] = [];
    const params: any[] = [];

    if (input.runId) {
      where.push('t.run_id = ?');
      params.push(input.runId);
    }

    if (input.sourceId) {
      where.push('t.source_id = ?');
      params.push(input.sourceId);
    }

    if (input.status !== undefined && [0, 1, 2, 3].includes(input.status)) {
      where.push('t.status = ?');
      params.push(input.status);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const pool = this.db.getPool();

    const [countRows] = await pool.query<any[]>(`SELECT COUNT(*) as c FROM bb_collect_task t ${whereSQL}`, params);
    const total = Number(countRows?.[0]?.c || 0);
    const offset = (page - 1) * pageSize;

    const [items] = await pool.query<any[]>(
      `SELECT t.id, t.run_id, t.source_id, s.name as source_name, t.status, t.current_page, t.total_pages,
              t.created_count, t.updated_count, t.error_count, t.error_message,
              t.started_at, t.finished_at, t.created_at, t.updated_at
       FROM bb_collect_task t
       LEFT JOIN bb_collect_source s ON s.id = t.source_id
       ${whereSQL}
       ORDER BY t.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    return { page, pageSize, total, items: items || [] };
  }
}
