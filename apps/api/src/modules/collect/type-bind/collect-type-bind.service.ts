import { BadRequestException, Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

@Injectable()
export class CollectTypeBindService {
  // Cache: sourceId -> { map, expireAt }
  private bindMapCache = new Map<number, { map: Map<number, number>; expireAt: number }>();
  private readonly cacheTTL = 3600; // 1 hour

  constructor(private readonly db: MySQLService) {}

  async listBindings(sourceId: number) {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      `SELECT b.id, b.source_id, b.remote_type_id, b.remote_type_name, b.local_type_id, t.type_name as local_type_name
       FROM bb_collect_type_bind b
       LEFT JOIN bb_type t ON t.type_id = b.local_type_id
       WHERE b.source_id = ?
       ORDER BY b.remote_type_id ASC`,
      [sourceId],
    );
    return { items: rows || [] };
  }

  async saveBind(input: {
    source_id: number;
    remote_type_id: number;
    remote_type_name?: string;
    local_type_id: number;
  }) {
    const sourceId = Number(input.source_id);
    const remoteTypeId = Number(input.remote_type_id);
    const localTypeId = Number(input.local_type_id);
    const remoteTypeName = String(input.remote_type_name || '').trim();

    if (!sourceId || !remoteTypeId) {
      throw new BadRequestException('source_id and remote_type_id required');
    }

    const pool = this.db.getPool();
    const t = nowSec();

    // Upsert
    await pool.query(
      `INSERT INTO bb_collect_type_bind (source_id, remote_type_id, remote_type_name, local_type_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE local_type_id = VALUES(local_type_id), remote_type_name = VALUES(remote_type_name), updated_at = VALUES(updated_at)`,
      [sourceId, remoteTypeId, remoteTypeName, localTypeId, t, t],
    );

    return { ok: true };
  }

  async saveBindBatch(
    sourceId: number,
    bindings: Array<{ remote_type_id: number; remote_type_name?: string; local_type_id: number }>,
  ) {
    if (!sourceId) throw new BadRequestException('source_id required');
    if (!Array.isArray(bindings) || bindings.length === 0) {
      return { ok: true, count: 0 };
    }

    const pool = this.db.getPool();
    const t = nowSec();

    const toDelete: number[] = [];
    const toUpsert: Array<{ remoteTypeId: number; remoteTypeName: string; localTypeId: number }> = [];

    for (const b of bindings) {
      const remoteTypeId = Number(b.remote_type_id);
      const localTypeId = Number(b.local_type_id);
      const remoteTypeName = String(b.remote_type_name || '').trim();
      if (!remoteTypeId) continue;

      if (localTypeId <= 0) {
        toDelete.push(remoteTypeId);
      } else {
        toUpsert.push({ remoteTypeId, remoteTypeName, localTypeId });
      }
    }

    // Delete unbindings
    if (toDelete.length > 0) {
      await pool.query('DELETE FROM bb_collect_type_bind WHERE source_id = ? AND remote_type_id IN (?)', [
        sourceId,
        toDelete,
      ]);
    }

    // Upsert bindings
    for (const b of toUpsert) {
      await pool.query(
        `INSERT INTO bb_collect_type_bind (source_id, remote_type_id, remote_type_name, local_type_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE local_type_id = VALUES(local_type_id), remote_type_name = VALUES(remote_type_name), updated_at = VALUES(updated_at)`,
        [sourceId, b.remoteTypeId, b.remoteTypeName, b.localTypeId, t, t],
      );
    }

    this.clearBindMapCache(sourceId);
    return { ok: true, count: toUpsert.length, deleted: toDelete.length };
  }

  async deleteBind(sourceId: number, remoteTypeId: number) {
    if (!sourceId || !remoteTypeId) {
      throw new BadRequestException('source_id and remote_type_id required');
    }
    const pool = this.db.getPool();
    await pool.query('DELETE FROM bb_collect_type_bind WHERE source_id = ? AND remote_type_id = ?', [
      sourceId,
      remoteTypeId,
    ]);
    this.clearBindMapCache(sourceId);
    return { ok: true };
  }

  async getBindMap(sourceId: number): Promise<Map<number, number>> {
    const now = nowSec();
    const cached = this.bindMapCache.get(sourceId);
    if (cached && cached.expireAt > now) {
      return cached.map;
    }

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT remote_type_id, local_type_id FROM bb_collect_type_bind WHERE source_id = ?',
      [sourceId],
    );
    const map = new Map<number, number>();
    for (const r of rows || []) {
      map.set(Number(r.remote_type_id), Number(r.local_type_id));
    }
    this.bindMapCache.set(sourceId, { map, expireAt: now + this.cacheTTL });
    return map;
  }

  clearBindMapCache(sourceId?: number) {
    if (sourceId !== undefined) {
      this.bindMapCache.delete(sourceId);
    } else {
      this.bindMapCache.clear();
    }
  }

  async fetchRemoteTypes(baseUrl: string) {
    const url = this.buildTypesUrl(baseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      // JSON format: { class: [{ type_id, type_name, type_pid }] }
      if (Array.isArray(data.class)) {
        return {
          ok: true,
          types: data.class.map((t: any) => ({
            type_id: Number(t.type_id),
            type_name: String(t.type_name || ''),
            type_pid: Number(t.type_pid || 0),
          })),
        };
      }
      return { ok: false, msg: 'Invalid response format', types: [] };
    } catch (e: any) {
      clearTimeout(timeout);
      return { ok: false, msg: e.message || 'Fetch failed', types: [] };
    }
  }

  private buildTypesUrl(baseUrl: string) {
    const base = String(baseUrl || '').trim().replace(/\/+$/, '');
    const url = new URL(base);
    url.searchParams.set('ac', 'list');
    return url.toString();
  }
}
