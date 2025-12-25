import { BadRequestException, Injectable } from '@nestjs/common';
import { MySQLService } from '../../db/mysql.service';
import { loadEnv } from '../../env';
import { RuntimeConfigService } from '../../config/runtime-config.service';
import { CollectSettingsService } from './settings/collect-settings.service';
import { CollectTaskService } from './collect-task.service';
import { CronSchedulerService } from './cron/cron-scheduler.service';

export type CollectRunStatus = 0 | 1 | 2 | 3; // 0=pending,1=running,2=done,3=failed

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function parseScheduleSeconds(cronLike: string): number {
  const raw = String(cronLike || '').trim();
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Math.max(0, Number(raw));
  const m = raw.match(/^@every\s+(\d+)$/i);
  if (m) return Math.max(0, Number(m[1]));
  return 0;
}

@Injectable()
export class CollectService {
  constructor(
    private readonly db: MySQLService,
    private readonly cfg: RuntimeConfigService,
    private readonly collectSettings: CollectSettingsService,
    private readonly collectTask: CollectTaskService,
    private readonly cronScheduler?: CronSchedulerService,
  ) {}

  async reapStaleRuns(opts?: { staleSeconds?: number; limit?: number }) {
    const staleSeconds = Math.max(60, Number(opts?.staleSeconds || 600)); // 默认 10 分钟
    const limit = Math.max(1, Math.min(200, Number(opts?.limit || 50)));
    const pool = this.db.getPool();
    const t = nowSec();
    const cutoff = t - staleSeconds;

    // 选择长时间未更新的运行中任务 (status=1) 已停止更新太长时间.
    const [rows] = await pool.query<any[]>(
      'SELECT id FROM bb_collect_run WHERE status = 1 AND finished_at = 0 AND updated_at < ? ORDER BY id ASC LIMIT ?',
      [cutoff, limit],
    );
    const ids = (rows || []).map((r) => Number(r.id)).filter(Boolean);
    if (!ids.length) return { ok: true, reaped: 0 };

    const placeholders = ids.map(() => '?').join(',');
    await pool.query(
      `UPDATE bb_collect_run
       SET status = 3,
           error_count = GREATEST(error_count, 1),
           message = CONCAT('stale run timeout (no update for ', ?, 's)'),
           finished_at = ?,
           updated_at = ?
       WHERE id IN (${placeholders}) AND status = 1 AND finished_at = 0`,
      [staleSeconds, t, t, ...ids],
    );
    return { ok: true, reaped: ids.length };
  }

  async getOldestPendingRunId(): Promise<number> {
    const [rows] = await this.db.getPool().query<any[]>(
      'SELECT id FROM bb_collect_run WHERE status = 0 ORDER BY id ASC LIMIT 1',
    );
    return Number(rows?.[0]?.id || 0);
  }

  async failRunIfPending(idRaw: number, message: string) {
    const id = Number(idRaw);
    if (!id) return { ok: true, updated: 0 };
    const t = nowSec();
    const msg = String(message || '').slice(0, 2000);
    const [res] = await this.db
      .getPool()
      .query<any>(
        'UPDATE bb_collect_run SET status = 3, error_count = GREATEST(error_count, 1), message = ?, finished_at = ?, updated_at = ? WHERE id = ? AND status = 0',
        [msg, t, t, id],
      );
    return { ok: true, updated: Number(res?.affectedRows || 0) };
  }

  async listSources() {
    const [rows] = await this.db.getPool().query<any[]>(
      'SELECT id, name, base_url, collect_type, status, created_at, updated_at FROM bb_collect_source ORDER BY id DESC',
    );
    return { items: rows || [] };
  }

  async createSource(input: { name: string; base_url: string; collect_type?: number; status?: number }) {
    const name = String(input.name || '').trim();
    const baseUrl = String(input.base_url || '')
      .trim()
      .replace(/\/+$/, '');
    if (name.length < 2) throw new BadRequestException('name too short');
    if (!baseUrl) throw new BadRequestException('base_url required');

    const collectType = Number(input.collect_type ?? 2) || 2;
    const status = Number(input.status ?? 1) ? 1 : 0;
    const t = nowSec();

    const pool = this.db.getPool();
    const [exists] = await pool.query<any[]>('SELECT id FROM bb_collect_source WHERE base_url = ? LIMIT 1', [baseUrl]);
    if (exists?.[0]) throw new BadRequestException('base_url exists');

    const [res] = await pool.query<any>(
      'INSERT INTO bb_collect_source (name, base_url, collect_type, status, created_at, updated_at) VALUES (?,?,?,?,?,?)',
      [name, baseUrl, collectType, status, t, t],
    );
    return { ok: true, id: res.insertId };
  }

  async saveSource(input: {
    id: number;
    name?: string;
    base_url?: string;
    collect_type?: number;
    status?: number;
  }) {
    const id = Number(input.id);
    if (!id) throw new BadRequestException('id invalid');

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SELECT id FROM bb_collect_source WHERE id = ? LIMIT 1', [id]);
    if (!rows?.[0]) throw new BadRequestException('source not found');

    const fields: string[] = [];
    const params: any[] = [];
    if (input.name !== undefined) {
      const name = String(input.name || '').trim();
      if (name.length < 2) throw new BadRequestException('name too short');
      fields.push('name = ?');
      params.push(name);
    }
    if (input.base_url !== undefined) {
      const baseUrl = String(input.base_url || '')
        .trim()
        .replace(/\/+$/, '');
      if (!baseUrl) throw new BadRequestException('base_url required');
      const [dup] = await pool.query<any[]>('SELECT id FROM bb_collect_source WHERE base_url = ? AND id <> ? LIMIT 1', [
        baseUrl,
        id,
      ]);
      if (dup?.[0]) throw new BadRequestException('base_url exists');
      fields.push('base_url = ?');
      params.push(baseUrl);
    }
    if (input.collect_type !== undefined) {
      fields.push('collect_type = ?');
      params.push(Number(input.collect_type) || 2);
    }
    if (input.status !== undefined) {
      fields.push('status = ?');
      params.push(Number(input.status) ? 1 : 0);
    }
    fields.push('updated_at = ?');
    params.push(nowSec());

    params.push(id);
    await pool.query(`UPDATE bb_collect_source SET ${fields.join(', ')} WHERE id = ?`, params);
    return { ok: true };
  }

  async deleteSource(id: number) {
    if (!id) throw new BadRequestException('id invalid');
    const pool = this.db.getPool();
    const [used] = await pool.query<any[]>('SELECT job_id FROM bb_collect_job_source WHERE source_id = ? LIMIT 1', [id]);
    if (used?.[0]) throw new BadRequestException('source used by jobs');
    await pool.query('DELETE FROM bb_collect_source WHERE id = ? LIMIT 1', [id]);
    return { ok: true };
  }

  async listJobs() {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id, name, domain_url, api_pass, collect_time, interval_seconds, push_workers, push_interval_seconds, max_workers, cron, status, created_at, updated_at FROM bb_collect_job ORDER BY id DESC',
    );
    const jobIds = (rows || []).map((r) => Number(r.id)).filter(Boolean);
    const map = new Map<number, number[]>();
    if (jobIds.length) {
      const [links] = await pool.query<any[]>(
        `SELECT job_id, source_id FROM bb_collect_job_source WHERE job_id IN (${jobIds.map(() => '?').join(',')})`,
        jobIds,
      );
      for (const l of links || []) {
        const jid = Number(l.job_id);
        const sid = Number(l.source_id);
        if (!jid || !sid) continue;
        map.set(jid, [...(map.get(jid) || []), sid]);
      }
    }
    return { items: (rows || []).map((j) => ({ ...j, source_ids: map.get(Number(j.id)) || [] })) };
  }

  async createJob(input: {
    name: string;
    domain_url?: string;
    api_pass?: string;
    collect_time?: number;
    interval_seconds?: number;
    push_workers?: number;
    push_interval_seconds?: number;
    max_workers?: number;
    cron?: string;
    status?: number;
    source_ids?: number[];
  }) {
    const name = String(input.name || '').trim();
    const domainUrl = String(input.domain_url || '').trim().replace(/\/+$/, '');
    const apiPass = String(input.api_pass || '').trim();
    if (name.length < 2) throw new BadRequestException('name too short');

    const collectTime = Number(input.collect_time ?? 24);
    const intervalSeconds = Math.max(0, Number(input.interval_seconds ?? 1));
    const pushWorkers = Math.max(1, Number(input.push_workers ?? 1));
    const pushIntervalSeconds = Math.max(0, Number(input.push_interval_seconds ?? 2));
    const maxWorkers = Math.max(1, Number(input.max_workers ?? 2));
    const cron = String(input.cron || '').trim(); // 支持 "3600" 或 "@every 3600"
    const status = Number(input.status ?? 1) ? 1 : 0;
    const sourceIds = Array.isArray(input.source_ids) ? input.source_ids.map((n) => Number(n)).filter(Boolean) : [];

    const pool = this.db.getPool();
    const t = nowSec();
    const [res] = await pool.query<any>(
      'INSERT INTO bb_collect_job (name, domain_url, api_pass, collect_time, interval_seconds, push_workers, push_interval_seconds, max_workers, cron, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        name,
        domainUrl || '',
        apiPass || '',
        collectTime,
        intervalSeconds,
        pushWorkers,
        pushIntervalSeconds,
        maxWorkers,
        cron,
        status,
        t,
        t,
      ],
    );
    const jobId = Number(res.insertId);

    if (sourceIds.length) {
      const values = sourceIds.map((sid) => [jobId, sid]);
      await pool.query('INSERT IGNORE INTO bb_collect_job_source (job_id, source_id) VALUES ?', [values]);
    }
    return { ok: true, id: jobId };
  }

  async saveJob(input: {
    id: number;
    name?: string;
    domain_url?: string;
    api_pass?: string;
    collect_time?: number;
    interval_seconds?: number;
    push_workers?: number;
    push_interval_seconds?: number;
    max_workers?: number;
    cron?: string;
    status?: number;
    source_ids?: number[];
  }) {
    const id = Number(input.id);
    if (!id) throw new BadRequestException('id invalid');
    const pool = this.db.getPool();

    const [exists] = await pool.query<any[]>('SELECT id FROM bb_collect_job WHERE id = ? LIMIT 1', [id]);
    if (!exists?.[0]) throw new BadRequestException('job not found');

    const fields: string[] = [];
    const params: any[] = [];
    const setStr = (key: string, v?: string, minLen?: number) => {
      if (v === undefined) return;
      const val = String(v || '').trim();
      if (minLen && val.length < minLen) throw new BadRequestException(`${key} too short`);
      fields.push(`${key} = ?`);
      params.push(val);
    };

    if (input.name !== undefined) setStr('name', input.name, 2);
    if (input.domain_url !== undefined)
      setStr(
        'domain_url',
        String(input.domain_url || '')
          .trim()
          .replace(/\/+$/, ''),
        1,
      );
    if (input.api_pass !== undefined) setStr('api_pass', input.api_pass, 8);
    if (input.cron !== undefined) setStr('cron', input.cron);

    const setNum = (key: string, v?: number, min?: number) => {
      if (v === undefined) return;
      const val = Number(v);
      if (!Number.isFinite(val)) throw new BadRequestException(`${key} invalid`);
      fields.push(`${key} = ?`);
      params.push(min === undefined ? val : Math.max(min, val));
    };

    setNum('collect_time', input.collect_time, 0);
    setNum('interval_seconds', input.interval_seconds, 0);
    setNum('push_workers', input.push_workers, 1);
    setNum('push_interval_seconds', input.push_interval_seconds, 0);
    setNum('max_workers', input.max_workers, 1);

    if (input.status !== undefined) {
      fields.push('status = ?');
      params.push(Number(input.status) ? 1 : 0);
    }

    fields.push('updated_at = ?');
    params.push(nowSec());
    params.push(id);

    await pool.query(`UPDATE bb_collect_job SET ${fields.join(', ')} WHERE id = ?`, params);

    if (input.source_ids) {
      const sourceIds = Array.isArray(input.source_ids) ? input.source_ids.map((n) => Number(n)).filter(Boolean) : [];
      await pool.query('DELETE FROM bb_collect_job_source WHERE job_id = ?', [id]);
      if (sourceIds.length) {
        const values = sourceIds.map((sid) => [id, sid]);
        await pool.query('INSERT IGNORE INTO bb_collect_job_source (job_id, source_id) VALUES ?', [values]);
      }
    }

    // Update cron scheduler if cron or status changed
    if (this.cronScheduler && (input.cron !== undefined || input.status !== undefined)) {
      const [job] = await pool.query<any[]>('SELECT cron, status FROM bb_collect_job WHERE id = ? LIMIT 1', [id]);
      if (job?.[0]) {
        await this.cronScheduler.updateJobSchedule(id, job[0].cron, job[0].status);
      }
    }

    return { ok: true };
  }

  async deleteJob(id: number) {
    if (!id) throw new BadRequestException('id invalid');
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_collect_job_source WHERE job_id = ?', [id]);
    await pool.query('DELETE FROM bb_collect_job WHERE id = ? LIMIT 1', [id]);
    if (this.cronScheduler) {
      this.cronScheduler.clearJobSchedule(id);
    }
    return { ok: true };
  }

  async createRun(jobId: number, sourceIds?: number[]) {
    if (!jobId) throw new BadRequestException('jobId invalid');
    const pool = this.db.getPool();
    const [job] = await pool.query<any[]>('SELECT id FROM bb_collect_job WHERE id = ? LIMIT 1', [jobId]);
    if (!job?.[0]) throw new BadRequestException('job not found');

    const t = nowSec();
    const [res] = await pool.query<any>(
      'INSERT INTO bb_collect_run (job_id, status, created_at, updated_at) VALUES (?,?,?,?)',
      [jobId, 0, t, t],
    );
    const runId = Number(res.insertId);

    // 获取该任务关联的所有采集源
    let finalSourceIds = sourceIds;
    if (!finalSourceIds || finalSourceIds.length === 0) {
      const [srcRows] = await pool.query<any[]>(
        'SELECT source_id FROM bb_collect_job_source WHERE job_id = ? ORDER BY source_id ASC',
        [jobId],
      );
      finalSourceIds = (srcRows || []).map((r) => Number(r.source_id)).filter(Boolean);
    }

    // 为每个采集源创建独立的采集任务（支持多线路并发）
    if (finalSourceIds.length) {
      await this.collectTask.createTasksForRun(runId, finalSourceIds);
    } else {
      // 如果没有关联的采集源，标记为失败
      await pool.query(
        'UPDATE bb_collect_run SET status = 3, message = ?, finished_at = ?, updated_at = ? WHERE id = ?',
        ['no sources bound to this job', t, t, runId],
      );
    }

    return { ok: true, id: runId };
  }

  async listRuns(input: { page: number; pageSize: number; status?: number; jobId?: number }) {
    const page = Math.max(1, Number(input.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(input.pageSize || 20)));
    const status = input.status === undefined ? undefined : Number(input.status);
    const jobId = input.jobId === undefined ? undefined : Number(input.jobId);

    const where: string[] = [];
    const params: any[] = [];
    if (status === 0 || status === 1 || status === 2 || status === 3) {
      where.push('r.status = ?');
      params.push(status);
    }
    if (jobId) {
      where.push('r.job_id = ?');
      params.push(jobId);
    }
    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const pool = this.db.getPool();
    const [countRows] = await pool.query<any[]>(`SELECT COUNT(*) as c FROM bb_collect_run r ${whereSQL}`, params);
    const total = Number(countRows?.[0]?.c || 0);
    const offset = (page - 1) * pageSize;

    const [items] = await pool.query<any[]>(
      `SELECT r.id, r.job_id, j.name as job_name, r.status, r.worker_id, r.progress_page, r.progress_total_pages, r.pushed_count, r.updated_count, r.created_count, r.error_count, r.message, r.started_at, r.finished_at, r.created_at, r.updated_at
       FROM bb_collect_run r
       LEFT JOIN bb_collect_job j ON j.id = r.job_id
       ${whereSQL}
       ORDER BY r.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );
    return { page, pageSize, total, items: items || [] };
  }

  async pullNextRun(workerIdRaw: string) {
    const workerId = String(workerIdRaw || '').trim() || 'worker';

    // 先尝试获取待处理的采集任务（多线路支持）
    const taskResult = await this.collectTask.getNextPendingTask();
    if (!taskResult.ok || !taskResult.task) {
      return { ok: true, run: null };
    }

    const task = taskResult.task;
    const pool = this.db.getPool();
    const t = nowSec();

    // 获取采集运行信息
    const [runRows] = await pool.query<any[]>(
      'SELECT id, job_id FROM bb_collect_run WHERE id = ? LIMIT 1',
      [task.run_id],
    );

    if (!runRows?.[0]) {
      // 任务对应的运行已删除，标记任务为失败
      await this.collectTask.completeTask(task.id, 3, 'run not found');
      return { ok: true, run: null };
    }

    const run = runRows[0];
    const jobId = Number(run.job_id);

    // 获取采集任务的当前进度（支持断点续采）
    const [taskRows] = await pool.query<any[]>(
      'SELECT current_page, total_pages FROM bb_collect_task WHERE id = ? LIMIT 1',
      [task.id],
    );

    const taskProgress = taskRows?.[0] || { current_page: 1, total_pages: 0 };

    // 获取采集任务配置
    const [jobRows] = await pool.query<any[]>(
      'SELECT id, name, domain_url, api_pass, collect_time, interval_seconds, push_workers, push_interval_seconds, max_workers, cron FROM bb_collect_job WHERE id = ? LIMIT 1',
      [jobId],
    );

    const job = jobRows?.[0] || null;

    if (job) {
      const env = loadEnv();
      const sys = await this.getSystemInterfacePass();
      const globalCfg = await this.collectSettings.get();
      job.domain_url = `http://127.0.0.1:${env.PORT}`;
      job.api_pass = sys || this.cfg.require().security.interfacePass;
      job.filter_keywords = String(globalCfg.filterKeywords || '').trim();
    }

    return {
      ok: true,
      run: {
        id: Number(run.id),
        job_id: jobId,
        task_id: task.id,
        source_id: task.source_id,
        current_page: Number(taskProgress.current_page || 1),
        total_pages: Number(taskProgress.total_pages || 0),
      },
      job,
      sources: task.source ? [task.source] : [],
    };
  }

  private async getSystemInterfacePass(): Promise<string> {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SELECT value_json FROM bb_setting WHERE `key` = ? LIMIT 1', ['system']);
    const row = rows?.[0];
    if (!row) return '';
    try {
      const val = JSON.parse(row.value_json || '{}');
      return String(val?.interfacePass || '').trim();
    } catch {
      return '';
    }
  }

  async reportRun(input: {
    id: number;
    task_id?: number;
    status?: CollectRunStatus;
    progress_page?: number;
    progress_total_pages?: number;
    pushed_count?: number;
    updated_count?: number;
    created_count?: number;
    error_count?: number;
    message?: string;
  }) {
    const id = Number(input.id);
    if (!id) throw new BadRequestException('id invalid');

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SELECT id FROM bb_collect_run WHERE id = ? LIMIT 1', [id]);
    if (!rows?.[0]) throw new BadRequestException('run not found');

    const fields: string[] = [];
    const params: any[] = [];

    if (input.status !== undefined) {
      const status = Number(input.status) as CollectRunStatus;
      if (![0, 1, 2, 3].includes(status)) throw new BadRequestException('status invalid');
      fields.push('status = ?');
      params.push(status);
      if (status === 1) {
        fields.push('started_at = ?');
        params.push(nowSec());
      }
      if (status === 2 || status === 3) {
        fields.push('finished_at = ?');
        params.push(nowSec());
      }
    }

    if (input.progress_page !== undefined) {
      fields.push('progress_page = ?');
      params.push(Math.max(0, Number(input.progress_page) || 0));
    }

    if (input.progress_total_pages !== undefined) {
      fields.push('progress_total_pages = ?');
      params.push(Math.max(0, Number(input.progress_total_pages) || 0));
    }

    if (input.message !== undefined) {
      fields.push('message = ?');
      params.push(String(input.message || '').slice(0, 2000));
    }

    fields.push('updated_at = ?');
    params.push(nowSec());

    params.push(id);
    await pool.query(`UPDATE bb_collect_run SET ${fields.join(', ')} WHERE id = ?`, params);

    // 如果提供了 task_id，更新任务并聚合所有任务的统计信息
    if (input.task_id) {
      const taskId = Number(input.task_id);
      await this.collectTask.updateTaskProgress({
        taskId,
        currentPage: input.progress_page,
        totalPages: input.progress_total_pages,
        createdCount: input.created_count,
        updatedCount: input.updated_count,
        errorCount: input.error_count,
      });

      // 如果任务已完成或失败，标记为相应状态
      if (input.status === 2 || input.status === 3) {
        await this.collectTask.completeTask(taskId, input.status as 2 | 3, input.message);
      }

      // 聚合此运行中所有任务的统计信息
      const stats = await this.collectTask.getTaskStats(id);
      if (stats.ok) {
        const aggregated = stats.stats;
        await pool.query(
          `UPDATE bb_collect_run SET pushed_count = ?, created_count = ?, updated_count = ?, error_count = ?, updated_at = ? WHERE id = ?`,
          [
            aggregated.totalCreated + aggregated.totalUpdated,
            aggregated.totalCreated,
            aggregated.totalUpdated,
            aggregated.totalErrors,
            nowSec(),
            id,
          ],
        );
      }
    }

    return { ok: true };
  }

  async enqueueDueJobs() {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      `SELECT j.id, j.cron,
              COALESCE(MAX(r.created_at), 0) AS last_created_at,
              SUM(CASE WHEN r.status IN (0,1) THEN 1 ELSE 0 END) AS active_runs
       FROM bb_collect_job j
       LEFT JOIN bb_collect_run r ON r.job_id = j.id
       WHERE j.status = 1 AND j.cron <> ''
       GROUP BY j.id`,
    );
    const t = nowSec();
    for (const row of rows || []) {
      const jobId = Number(row.id);
      const seconds = parseScheduleSeconds(String(row.cron || ''));
      if (!jobId || seconds <= 0) continue;
      if (Number(row.active_runs || 0) > 0) continue;
      const last = Number(row.last_created_at || 0);
      if (last && t - last < seconds) continue;
      await pool.query('INSERT INTO bb_collect_run (job_id, status, created_at, updated_at) VALUES (?,?,?,?)', [
        jobId,
        0,
        t,
        t,
      ]);
    }
    return { ok: true };
  }

  async hasPendingRuns(): Promise<boolean> {
    const [rows] = await this.db.getPool().query<any[]>('SELECT id FROM bb_collect_run WHERE status = 0 LIMIT 1');
    return Boolean(rows?.[0]?.id);
  }

  async cancelRun(id: number) {
    if (!id) throw new BadRequestException('id invalid');
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SELECT id, status FROM bb_collect_run WHERE id = ? LIMIT 1', [id]);
    if (!rows?.[0]) throw new BadRequestException('run not found');

    const status = Number(rows[0].status);
    // 只能取消待处理 (0) 或运行中的 (1) 任务
    if (status !== 0 && status !== 1) {
      throw new BadRequestException('run already finished');
    }

    const t = nowSec();
    // 使用事务确保原子性
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 更新运行状态
      await conn.query('UPDATE bb_collect_run SET status = 3, message = ?, finished_at = ?, updated_at = ? WHERE id = ?', [
        'cancelled by user',
        t,
        t,
        id,
      ]);

      // 取消所有关联的任务 (包括运行中的任务)
      await conn.query('UPDATE bb_collect_task SET status = 3, finished_at = ?, updated_at = ? WHERE run_id = ? AND status IN (0, 1, 2)', [
        t,
        t,
        id,
      ]);

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return { ok: true };
  }

  async deleteRun(id: number) {
    if (!id) throw new BadRequestException('id invalid');
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_collect_run WHERE id = ? LIMIT 1', [id]);
    return { ok: true };
  }
}
