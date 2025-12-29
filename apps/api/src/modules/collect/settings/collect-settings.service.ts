import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

export type CollectSettings = {
  // Global keyword filter (csv); applied by Go worker and optionally by receive.
  filterKeywords?: string;

  // Default status for newly inserted vod (0=unapproved,1=approved)
  defaultVodStatus?: 0 | 1;

  // Randomize stats on insert (optional)
  randomHits?: boolean;
  randomHitsMin?: number;
  randomHitsMax?: number;
  randomUpDown?: boolean;
  randomUpMin?: number;
  randomUpMax?: number;
  randomDownMin?: number;
  randomDownMax?: number;
  randomScore?: boolean;
  randomScoreMin?: number; // 0.0
  randomScoreMax?: number; // 10.0

  // Synonyms are stored as "a=b" lines (one per line).
  enableSynonyms?: boolean;
  nameSynonymsText?: string;
  contentSynonymsText?: string;
  playFromSynonymsText?: string;
  areaSynonymsText?: string;
  langSynonymsText?: string;

  // Ingest / update rules
  dedupFields?: Array<'name' | 'type' | 'year' | 'area' | 'lang' | 'actor' | 'director'>;
  updateFields?: Array<'pic' | 'content' | 'remarks' | 'year' | 'area' | 'lang' | 'actor' | 'director' | 'play'>;
  playUpdateMode?: 'merge' | 'replace';

  // Optional: sync images to local storage
  syncImages?: boolean;
  syncImageMaxBytes?: number;
};

const KEY = 'collect';

@Injectable()
export class CollectSettingsService {
  constructor(private readonly db: MySQLService) {}

  async get(): Promise<CollectSettings> {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SELECT value_json FROM bb_setting WHERE `key` = ? LIMIT 1', [KEY]);
    const row = rows?.[0];
    if (!row) {
      return {
        filterKeywords: '',
        defaultVodStatus: 1,
        randomHits: false,
        randomHitsMin: 1,
        randomHitsMax: 1000,
        randomUpDown: false,
        randomUpMin: 1,
        randomUpMax: 1000,
        randomDownMin: 1,
        randomDownMax: 1000,
        randomScore: false,
        randomScoreMin: 6.0,
        randomScoreMax: 9.9,
        enableSynonyms: false,
        nameSynonymsText: '',
        contentSynonymsText: '',
        playFromSynonymsText: '',
        areaSynonymsText: '',
        langSynonymsText: '',
        dedupFields: ['name', 'type'],
        updateFields: ['play', 'remarks', 'pic'],
        playUpdateMode: 'merge',
        syncImages: false,
        syncImageMaxBytes: 3_000_000,
      };
    }
    try {
      const parsed = JSON.parse(row.value_json || '{}');
      return {
        filterKeywords: '',
        defaultVodStatus: 1,
        randomHits: false,
        randomHitsMin: 1,
        randomHitsMax: 1000,
        randomUpDown: false,
        randomUpMin: 1,
        randomUpMax: 1000,
        randomDownMin: 1,
        randomDownMax: 1000,
        randomScore: false,
        randomScoreMin: 6.0,
        randomScoreMax: 9.9,
        enableSynonyms: false,
        nameSynonymsText: '',
        contentSynonymsText: '',
        playFromSynonymsText: '',
        areaSynonymsText: '',
        langSynonymsText: '',
        dedupFields: ['name', 'type'],
        updateFields: ['play', 'remarks', 'pic'],
        playUpdateMode: 'merge',
        syncImages: false,
        syncImageMaxBytes: 3_000_000,
        ...(parsed || {}),
      };
    } catch {
      return {};
    }
  }

  async save(partial: CollectSettings) {
    const pool = this.db.getPool();
    const existing = await this.get();
    const merged = { ...existing, ...partial };
    const now = Math.floor(Date.now() / 1000);
    await pool.query(
      'INSERT INTO bb_setting (`key`, value_json, updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value_json=VALUES(value_json), updated_at=VALUES(updated_at)',
      [KEY, JSON.stringify(merged), now],
    );
    return { ok: true, updatedAt: now, value: merged };
  }
}
