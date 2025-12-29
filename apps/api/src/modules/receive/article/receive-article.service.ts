import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { SystemSettingsService } from '../../admin/system/system-settings.service';
import { RuntimeConfigService } from '../../../config/runtime-config.service';
import { CollectSettingsService } from '../../collect/settings/collect-settings.service';
import { CollectTypeBindService } from '../../collect/type-bind/collect-type-bind.service';
import { pinyin } from 'pinyin-pro';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

function getPinyinAndLetter(name: string): { en: string; letter: string } {
  if (!name) return { en: '', letter: '' };
  const py = pinyin(name, { toneType: 'none', type: 'array' }).join('').toLowerCase();
  const letter = py.charAt(0).toUpperCase() || '';
  return { en: py, letter: /^[A-Z]$/.test(letter) ? letter : '#' };
}

function nowTs() {
  return Math.floor(Date.now() / 1000);
}

function trim(v: unknown) {
  return String(v ?? '').trim();
}

function toInt(v: unknown, def = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.floor(n);
}

function splitKeywords(csv: string) {
  return String(csv || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseSynonymsText(text: string): Array<[string, string]> {
  const lines = String(text || '')
    .split('\n')
    .map((l) => String(l ?? ''))
    .filter((l) => l.trim().length > 0);
  const pairs: Array<[string, string]> = [];
  for (const line of lines) {
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const a = line.slice(0, idx).replace(/\s+$/g, '');
    const b = line.slice(idx + 1).replace(/^\s+/g, '');
    if (!a) continue;
    pairs.push([a, b]);
  }
  return pairs;
}

function applySynonymsReplaceAll(input: string, pairs: Array<[string, string]>) {
  let out = input;
  for (const [a, b] of pairs) {
    if (!a) continue;
    out = out.split(a).join(b);
  }
  return out;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function randInt(min: number, max: number) {
  const a = clampInt(min, 0, 2_000_000_000);
  const b = clampInt(max, 0, 2_000_000_000);
  if (b <= a) return a;
  return a + Math.floor(Math.random() * (b - a + 1));
}

function randScore(min: number, max: number) {
  const a = Math.max(0, Math.min(10, Number(min)));
  const b = Math.max(0, Math.min(10, Number(max)));
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const raw = lo + Math.random() * (hi - lo);
  return Math.round(raw * 10) / 10;
}

function isHttpUrl(u: string) {
  return /^https?:\/\//i.test(String(u || '').trim());
}

@Injectable()
export class ReceiveArticleService {
  constructor(
    private readonly db: MySQLService,
    private readonly systemSettings: SystemSettingsService,
    private readonly cfg: RuntimeConfigService,
    private readonly collectSettings: CollectSettingsService,
    private readonly typeBind: CollectTypeBindService,
  ) {}

  async receiveArticle(body: Record<string, any>) {
    const sys = await this.systemSettings.get();
    const pass = trim(body.pass);
    const expectedPass = trim(sys.interfacePass || this.cfg.require().security.interfacePass);

    if (expectedPass !== pass) {
      return { code: 3002, msg: 'pass error' };
    }
    if (expectedPass.length < 16) {
      return { code: 3003, msg: 'pass too short' };
    }

    const artName = trim(body.art_name);
    if (!artName) return { code: 2001, msg: 'require name' };

    const collectCfg = await this.collectSettings.get();
    const enableSynonyms = Boolean(collectCfg.enableSynonyms);
    const namePairs = enableSynonyms ? parseSynonymsText(collectCfg.nameSynonymsText || '') : [];
    const contentPairs = enableSynonyms ? parseSynonymsText(collectCfg.contentSynonymsText || '') : [];
    const finalArtName = enableSynonyms && namePairs.length ? applySynonymsReplaceAll(artName, namePairs) : artName;

    const keywords = splitKeywords(collectCfg.filterKeywords || '');
    for (const kw of keywords) {
      if (kw && finalArtName.includes(kw)) return { code: 1001, msg: `blocked by keyword: ${kw}` };
    }

    let typeId = trim(body.type_id);
    let typeName = trim(body.type_name);
    const sourceId = toInt(body.source_id, 0);
    if (!typeId && !typeName) return { code: 2002, msg: 'require type' };

    const pool = this.db.getPool();

    // Check type binding first if source_id is provided
    let hasSourceBindings = false;
    if (sourceId > 0 && typeId) {
      const remoteTypeId = toInt(typeId, 0);
      if (remoteTypeId > 0) {
        const bindMap = await this.typeBind.getBindMap(sourceId);
        hasSourceBindings = bindMap.size > 0;
        const localTypeId = bindMap.get(remoteTypeId);
        if (localTypeId && localTypeId > 0) {
          typeId = String(localTypeId);
        } else if (hasSourceBindings) {
          return { code: 1002, msg: `type ${remoteTypeId} not bound for source ${sourceId}` };
        }
      }
    }

    // Find type by name if typeId not set
    if (!typeId && typeName) {
      const [typeRows] = await pool.query<any[]>(
        'SELECT type_id FROM bb_type WHERE type_mid = 2 AND type_status = 1 AND type_name = ? LIMIT 1',
        [typeName],
      );
      if (typeRows?.[0]?.type_id) typeId = String(typeRows[0].type_id);
    }
    if (!typeId && !typeName) return { code: 2002, msg: 'type not found' };

    let typeIdNum = toInt(typeId, 0);
    if (typeIdNum) {
      const [typeCheck] = await pool.query<any[]>(
        'SELECT type_id, type_name, type_pid FROM bb_type WHERE type_mid = 2 AND type_id = ? LIMIT 1',
        [typeIdNum],
      );
      if (typeCheck?.[0]?.type_id) {
        if (!typeName) typeName = String(typeCheck[0].type_name || '');
      } else if (typeName) {
        typeIdNum = 0;
      }
    }

    if (!typeIdNum) return { code: 2002, msg: 'type not found' };

    // Get parent type id
    const [typeInfo] = await pool.query<any[]>(
      'SELECT type_pid FROM bb_type WHERE type_id = ? LIMIT 1',
      [typeIdNum],
    );
    const typeId1 = toInt(typeInfo?.[0]?.type_pid, 0);

    const created = nowTs();
    const { letter } = getPinyinAndLetter(finalArtName);

    let artPic = trim(body.art_pic);
    const artSub = trim(body.art_sub);
    const artAuthor = trim(body.art_author);
    const artSource = trim(body.art_from || body.art_source);
    const artTag = trim(body.art_tag);
    const artBlurb = trim(body.art_blurb);
    const artRemarks = trim(body.art_remarks);
    let artContent = trim(body.art_content);
    if (enableSynonyms && contentPairs.length) {
      artContent = applySynonymsReplaceAll(artContent, contentPairs);
    }
    const artLevel = toInt(body.art_level, 0);
    const artStatus = body.art_status !== undefined ? toInt(body.art_status, 1) : 1;
    const artJumpUrl = trim(body.art_jumpurl);

    // Generate blurb from content if empty
    const finalBlurb = artBlurb || (artContent ? artContent.replace(/<[^>]+>/g, '').slice(0, 200) : '');

    // Random hits/score if configured
    const hits = collectCfg.randomHits ? randInt(Number(collectCfg.randomHitsMin || 1), Number(collectCfg.randomHitsMax || 1000)) : toInt(body.art_hits, 0);
    const up = collectCfg.randomUpDown ? randInt(Number(collectCfg.randomUpMin || 1), Number(collectCfg.randomUpMax || 1000)) : toInt(body.art_up, 0);
    const down = collectCfg.randomUpDown ? randInt(Number(collectCfg.randomDownMin || 1), Number(collectCfg.randomDownMax || 1000)) : toInt(body.art_down, 0);
    const score = collectCfg.randomScore ? randScore(Number(collectCfg.randomScoreMin || 6.0), Number(collectCfg.randomScoreMax || 9.9)) : 0.0;

    // Sync image if configured
    if (collectCfg.syncImages && artPic && isHttpUrl(artPic)) {
      artPic = await this.trySyncImage(artPic, Number(collectCfg.syncImageMaxBytes || 3_000_000));
    }

    // Check for existing article by name (and optionally type)
    const where: string[] = ['name = ?'];
    const params: any[] = [finalArtName];
    const dedupFields = Array.isArray(collectCfg.dedupFields) ? collectCfg.dedupFields : ['name', 'type'];
    if (dedupFields.includes('type')) {
      where.push('type_id = ?');
      params.push(typeIdNum);
    }

    const [existingRows] = await pool.query<any[]>(
      `SELECT id, pic, content FROM bb_article WHERE ${where.join(' AND ')} LIMIT 1`,
      params,
    );
    const existing = existingRows?.[0];

    if (!existing) {
      // Insert new article
      const [res] = await pool.query<any>(
        `INSERT INTO bb_article (type_id, type_id_1, name, sub, letter, color, pic, pic_thumb, author, source, tag, blurb, remarks, content, level, status, hits, hits_day, hits_week, hits_month, up, down, score, score_all, score_num, jump_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          typeIdNum, typeId1, finalArtName, artSub, letter, '', artPic, '', artAuthor, artSource, artTag, finalBlurb, artRemarks, artContent, artLevel, artStatus,
          hits, 0, 0, 0, up, down, score, 0, 0, artJumpUrl, created, created
        ],
      );
      return { code: 1, msg: 'add ok', art_id: res.insertId };
    }

    // Update existing article
    const updateFields = Array.isArray(collectCfg.updateFields) ? collectCfg.updateFields : ['content', 'pic'];
    const sets: string[] = [];
    const updateParams: any[] = [];

    if (updateFields.includes('pic') && artPic) {
      sets.push('pic = ?');
      updateParams.push(artPic);
    }
    if (updateFields.includes('content') && artContent) {
      sets.push('content = ?');
      updateParams.push(artContent);
    }
    if (updateFields.includes('remarks') && artRemarks) {
      sets.push('remarks = ?');
      updateParams.push(artRemarks);
    }

    sets.push('updated_at = ?');
    updateParams.push(created);
    updateParams.push(existing.id);

    await pool.query(`UPDATE bb_article SET ${sets.join(', ')} WHERE id = ?`, updateParams);
    return { code: 2, msg: 'update ok', art_id: existing.id };
  }

  private async trySyncImage(imgUrl: string, maxBytes: number): Promise<string> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const resp = await fetch(imgUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) return imgUrl;

      const contentType = String(resp.headers.get('content-type') || '').toLowerCase();
      const ext =
        contentType.includes('png')
          ? 'png'
          : contentType.includes('webp')
            ? 'webp'
            : contentType.includes('gif')
              ? 'gif'
              : 'jpg';

      const buf = Buffer.from(await resp.arrayBuffer());
      if (buf.length <= 0 || buf.length > Math.max(100_000, maxBytes || 3_000_000)) return imgUrl;

      const hash = crypto.createHash('sha1').update(buf).digest('hex');
      const dataDir = path.dirname(this.cfg.getConfigPath());
      const dir = path.join(dataDir, 'uploads', 'artpic');
      await fs.mkdir(dir, { recursive: true });
      const filename = `${hash}.${ext}`;
      const full = path.join(dir, filename);
      try {
        await fs.access(full);
      } catch {
        await fs.writeFile(full, buf);
      }
      return `/uploads/artpic/${filename}`;
    } catch {
      return imgUrl;
    }
  }
}
