import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from '../../../env';
import { RuntimeConfigService } from '../../../config/runtime-config.service';
import { CollectService } from '../collect.service';

@Injectable()
export class GoCollectorRunnerService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(GoCollectorRunnerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly cfg: RuntimeConfigService,
    private readonly collect: CollectService,
  ) {}

  onModuleInit() {
    // 每分钟检查待处理任务（cron 调度器处理任务入队）
    this.timer = setInterval(() => this.kick().catch(() => void 0), 60000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async kick() {
    if (this.running) return;
    await this.collect.reapStaleRuns().catch(() => void 0);
    const hasPending = await this.collect.hasPendingRuns() || await this.hasPendingTasks();
    if (!hasPending) return;
    await this.runOnce();
  }

  private async hasPendingTasks(): Promise<boolean> {
    try {
      const pool = (this.collect as any).db.getPool();
      const [rows] = await (pool.query as any)('SELECT id FROM bb_collect_task WHERE status = 0 LIMIT 1');
      return Boolean(rows?.[0]?.id);
    } catch {
      return false;
    }
  }

  private resolveCollectorPath() {
    const exe = process.platform === 'win32' ? 'collector.exe' : 'collector';
    // API cwd is usually `apps/api`, collector is sibling `../collector`.
    const collectorDir = path.resolve(process.cwd(), '..', 'collector');
    const binPath = path.join(collectorDir, 'dist', exe);
    return { collectorDir, binPath };
  }

  private ensureBinary() {
    const { collectorDir, binPath } = this.resolveCollectorPath();
    if (fs.existsSync(binPath)) return binPath;

    this.log.warn(`building collector: ${binPath}`);
    const distDir = path.dirname(binPath);
    fs.mkdirSync(distDir, { recursive: true });
    const cacheDir = path.join(collectorDir, '.cache', 'go-build');
    const goPath = path.join(collectorDir, '.cache', 'go');
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.mkdirSync(goPath, { recursive: true });
    const res = spawnSync('go', ['build', '-o', binPath, './cmd/collector'], {
      cwd: collectorDir,
      stdio: 'pipe',
      env: { ...process.env, GOCACHE: cacheDir, GOPATH: goPath },
    });
    if (res.status !== 0) {
      const out = Buffer.concat([res.stdout || Buffer.alloc(0), res.stderr || Buffer.alloc(0)]).toString('utf8');
      throw new Error(`go build failed: ${out || `exit=${res.status}`}`);
    }
    return binPath;
  }

  async runOnce() {
    if (this.running) return;
    this.running = true;
    try {
      const env = loadEnv();
      const cfg = this.cfg.require();

      const pendingId = await this.collect.getOldestPendingRunId().catch(() => 0);
      let binPath = '';
      try {
        binPath = this.ensureBinary();
      } catch (e: any) {
        const msg = String(e?.message || e || 'collector build failed');
        this.log.error(msg);
        if (pendingId) await this.collect.failRunIfPending(pendingId, msg).catch(() => void 0);
        return;
      }
      const apiBase = `http://127.0.0.1:${env.PORT}`;
      const token = cfg.security.collectorWorkerToken;

      this.log.log(`spawn collector --once (apiBase=${apiBase})`);

      await new Promise<void>((resolve, reject) => {
        const outBuf: string[] = [];
        const errBuf: string[] = [];
        const pushBuf = (arr: string[], s: string) => {
          const line = String(s || '').trim();
          if (!line) return;
          arr.push(line);
          if (arr.length > 40) arr.shift();
        };
        const child = spawn(binPath, ['--api-base', apiBase, '--token', token, '--once'], {
          stdio: 'pipe',
          env: process.env,
        });
        child.stdout.on('data', (d) => {
          const s = String(d);
          pushBuf(outBuf, s);
          this.log.debug(s.trim());
        });
        child.stderr.on('data', (d) => {
          const s = String(d);
          pushBuf(errBuf, s);
          this.log.warn(s.trim());
        });
        child.on('error', (err) => {
          const last = [...errBuf, ...outBuf].slice(-20).join('\n');
          const msg = last ? `${String(err)}\n${last}` : String(err);
          if (pendingId) this.collect.failRunIfPending(pendingId, msg).catch(() => void 0);
          reject(err);
        });
        child.on('exit', (code) => {
          if (code === 0) resolve();
          else {
            const last = [...errBuf, ...outBuf].slice(-20).join('\n');
            const msg = last ? `collector exit code=${code}\n${last}` : `collector exit code=${code}`;
            if (pendingId) this.collect.failRunIfPending(pendingId, msg).catch(() => void 0);
            reject(new Error(msg));
          }
        });
      });
    } finally {
      this.running = false;
    }
  }
}
