import fs from 'node:fs';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { loadEnv } from '../env';

export type RuntimeConfigV1 = {
  version: 1;
  mysql: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  security: {
    interfacePass: string;
    adminJwtSecret: string;
    memberJwtSecret: string;
    collectorWorkerToken: string;
  };
  site?: {
    siteName?: string;
  };
};

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

@Injectable()
export class RuntimeConfigService {
  private cached?: RuntimeConfigV1 | null;

  getConfigPath(): string {
    const env = loadEnv();
    const dir = path.resolve(env.CMS_DATA_DIR || path.join(process.cwd(), 'data'));
    return path.join(dir, 'runtime-config.json');
  }

  exists(): boolean {
    try {
      return fs.existsSync(this.getConfigPath());
    } catch {
      return false;
    }
  }

  read(): RuntimeConfigV1 | null {
    if (this.cached !== undefined) return this.cached;
    const cfgPath = this.getConfigPath();
    try {
      const raw = fs.readFileSync(cfgPath, 'utf8');
      const parsed = safeJsonParse(raw);
      if (!parsed || parsed.version !== 1) {
        this.cached = null;
        return null;
      }
      this.cached = parsed as RuntimeConfigV1;
      return this.cached;
    } catch {
      this.cached = null;
      return null;
    }
  }

  invalidate() {
    this.cached = undefined;
  }

  write(config: RuntimeConfigV1) {
    const cfgPath = this.getConfigPath();
    const dir = path.dirname(cfgPath);
    fs.mkdirSync(dir, { recursive: true });
    const tmpPath = cfgPath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), 'utf8');
    fs.renameSync(tmpPath, cfgPath);
    this.cached = config;
  }

  require(): RuntimeConfigV1 {
    const cfg = this.read();
    if (!cfg) {
      throw new Error('CMS not configured yet. Please visit /setup in Admin UI.');
    }
    return cfg;
  }
}

