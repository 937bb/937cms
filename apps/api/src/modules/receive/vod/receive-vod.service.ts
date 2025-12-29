import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { SystemSettingsService } from '../../admin/system/system-settings.service';
import { RuntimeConfigService } from '../../../config/runtime-config.service';
import { CollectSettingsService } from '../../collect/settings/collect-settings.service';
import { CollectTypeBindService } from '../../collect/type-bind/collect-type-bind.service';
import { VodQueryCacheService } from '../../../cache/vod-query-cache.service';
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
    // 注意：允许左侧（匹配串）包含前导空格，例如 " 第四季=第四季" 用于去掉空格。
    // 仅去掉：左侧的尾部空白、右侧的头部空白；右侧允许为空（删除）。
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

function splitGroups(text: string) {
  return String(text || '')
    .split('$$$')
    .map((s) => s.trim())
    .filter(Boolean);
}

function previewText(s: string, max = 60) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function isHttpUrl(u: string) {
  return /^https?:\/\//i.test(String(u || '').trim());
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

@Injectable()
export class ReceiveVodService {
  constructor(
    private readonly db: MySQLService,
    private readonly systemSettings: SystemSettingsService,
    private readonly cfg: RuntimeConfigService,
    private readonly collectSettings: CollectSettingsService,
    private readonly typeBind: CollectTypeBindService,
    private readonly vodCache: VodQueryCacheService,
  ) {}

  async receiveVod(body: Record<string, any>) {

    // 如果没有 playList，从 vod_play_from 和 vod_play_url 构建
    if (!body.playList || body.playList.length === 0) {
      if (body.vod_play_from && body.vod_play_url) {
        body.playList = this.buildPlayListFromLegacy(body.vod_play_from, body.vod_play_url);
      }
    }

    const sys = await this.systemSettings.get();
    const pass = trim(body.pass);
    const expectedPass = trim(sys.interfacePass || this.cfg.require().security.interfacePass);

    if (expectedPass !== pass) {
      return { code: 3002, msg: 'pass error' };
    }
    if (expectedPass.length < 16) {
      return { code: 3003, msg: 'pass too short' };
    }

    const vodName = trim(body.vod_name);
    if (!vodName) return { code: 2001, msg: 'require name' };

    const collectCfg = await this.collectSettings.get();
    const keywords = splitKeywords(collectCfg.filterKeywords || '');
    for (const kw of keywords) {
      if (kw && vodName.includes(kw)) return { code: 1001, msg: `blocked by keyword: ${kw}` };
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
        console.log(`[TypeBind Debug] sourceId=${sourceId}, remoteTypeId=${remoteTypeId}, bindMapSize=${bindMap.size}, localTypeId=${localTypeId}, bindMap=[${Array.from(bindMap.entries()).map(([k,v]) => `${k}=>${v}`).join(',')}]`);
        if (localTypeId && localTypeId > 0) {
          typeId = String(localTypeId);
        } else if (hasSourceBindings) {
          // If source has bindings but this type is not bound, skip
          return { code: 1002, msg: `type ${remoteTypeId} not bound for source ${sourceId}` };
        }
      }
    }

    if (!typeId && typeName) {
      const [typeRows] = await pool.query<any[]>(
        'SELECT type_id FROM bb_type WHERE type_mid = 1 AND type_status = 1 AND type_name = ? LIMIT 1',
        [typeName],
      );
      if (typeRows?.[0]?.type_id) typeId = String(typeRows[0].type_id);
    }
    if (!typeId) return { code: 2002, msg: 'type not found' };

    const enableSynonyms = Boolean(collectCfg.enableSynonyms);
    const namePairs = enableSynonyms ? parseSynonymsText(collectCfg.nameSynonymsText || '') : [];
    const contentPairs = enableSynonyms ? parseSynonymsText(collectCfg.contentSynonymsText || '') : [];
    const playFromPairs = enableSynonyms ? parseSynonymsText(collectCfg.playFromSynonymsText || '') : [];
    const areaPairs = enableSynonyms ? parseSynonymsText(collectCfg.areaSynonymsText || '') : [];
    const langPairs = enableSynonyms ? parseSynonymsText(collectCfg.langSynonymsText || '') : [];

    let finalVodName = vodName;
    if (enableSynonyms && namePairs.length) {
      finalVodName = applySynonymsReplaceAll(finalVodName, namePairs);
    }

    let vodPic = trim(body.vod_pic);
    const vodRemarks = trim(body.vod_remarks);
    const vodYear = trim(body.vod_year);
    const rawArea = trim(body.vod_area);
    const rawLang = trim(body.vod_lang);
    const vodArea = enableSynonyms && areaPairs.length ? applySynonymsReplaceAll(rawArea, areaPairs) : rawArea;
    const vodLang = enableSynonyms && langPairs.length ? applySynonymsReplaceAll(rawLang, langPairs) : rawLang;
    const vodActor = trim(body.vod_actor);
    const vodDirector = trim(body.vod_director);
    const vodWriter = trim(body.vod_writer);
    const vodPubdate = trim(body.vod_pubdate);
    const vodDuration = trim(body.vod_duration);
    const rawContent = trim(body.vod_content);
    const vodContent = enableSynonyms && contentPairs.length ? applySynonymsReplaceAll(rawContent, contentPairs) : rawContent;


    if (enableSynonyms) {
      const changed: string[] = [];
      if (finalVodName !== vodName) changed.push(`name "${vodName}" => "${finalVodName}"`);
      if (vodArea !== rawArea) changed.push(`area "${rawArea}" => "${vodArea}"`);
      if (vodLang !== rawLang) changed.push(`lang "${rawLang}" => "${vodLang}"`);
      if (vodContent !== rawContent) changed.push(`content "${previewText(rawContent)}" => "${previewText(vodContent)}"`);

    }

    let typeIdNum = toInt(typeId, 0);
    if (typeIdNum) {
      const [typeCheck] = await pool.query<any[]>(
        'SELECT type_id, type_name FROM bb_type WHERE type_mid = 1 AND type_id = ? LIMIT 1',
        [typeIdNum],
      );
      if (typeCheck?.[0]?.type_id) {
        if (!typeName) typeName = String(typeCheck[0].type_name || '');
      } else {
        // Local type not found, clear typeIdNum
        typeIdNum = 0;
      }
    }

    if (!typeIdNum) return { code: 2002, msg: 'type not found' };
    const created = nowTs();

    // Player whitelist: only keep groups whose from_key exists and enabled.
    const [playerRows] = await pool.query<any[]>(
      'SELECT from_key FROM bb_player WHERE status = 1',
    );
    const allowedFrom = new Set<string>((playerRows || []).map((r) => String(r.from_key || '').trim()).filter(Boolean));

    const defaultVodStatus = Number(collectCfg.defaultVodStatus) === 0 ? 0 : 1;
    const hits = collectCfg.randomHits ? randInt(Number(collectCfg.randomHitsMin || 1), Number(collectCfg.randomHitsMax || 1000)) : 0;
    const up = collectCfg.randomUpDown ? randInt(Number(collectCfg.randomUpMin || 1), Number(collectCfg.randomUpMax || 1000)) : 0;
    const down = collectCfg.randomUpDown ? randInt(Number(collectCfg.randomDownMin || 1), Number(collectCfg.randomDownMax || 1000)) : 0;
    const score = collectCfg.randomScore ? randScore(Number(collectCfg.randomScoreMin || 6.0), Number(collectCfg.randomScoreMax || 9.9)) : 0.0;
    const { en: vodEn, letter: vodLetter } = getPinyinAndLetter(finalVodName);

    if (collectCfg.syncImages && vodPic && isHttpUrl(vodPic)) {
      vodPic = await this.trySyncImage(vodPic, Number(collectCfg.syncImageMaxBytes || 3_000_000));
    }

    // Dedup rules (default: name + type)
    const dedupFields = Array.isArray(collectCfg.dedupFields) ? collectCfg.dedupFields : ['name', 'type'];
    const where: string[] = ['vod_name = ?'];
    const params: any[] = [finalVodName];
    if (dedupFields.includes('type')) {
      where.push('type_id = ?');
      params.push(typeIdNum);
    }
    if (dedupFields.includes('year') && vodYear) {
      where.push('vod_year = ?');
      params.push(vodYear);
    }
    if (dedupFields.includes('area') && vodArea) {
      where.push('vod_area = ?');
      params.push(vodArea);
    }
    if (dedupFields.includes('lang') && vodLang) {
      where.push('vod_lang = ?');
      params.push(vodLang);
    }
    if (dedupFields.includes('actor') && vodActor) {
      where.push('vod_actor = ?');
      params.push(vodActor);
    }
    if (dedupFields.includes('director') && vodDirector) {
      where.push('vod_director = ?');
      params.push(vodDirector);
    }

    const [existingRows] = await pool.query<any[]>(
      `SELECT vod_id, vod_pic, vod_remarks, vod_area, vod_lang, vod_year, vod_actor, vod_director, vod_content
       FROM bb_vod
       WHERE ${where.join(' AND ')}
       LIMIT 1`,
      params,
    );
    const existing = existingRows?.[0];

    if (!existing) {
      const insert = {
        type_id: typeIdNum,
        type_id_1: 0,
        group_id: 0,
        vod_name: finalVodName,
        vod_sub: '',
        vod_en: vodEn,
        vod_status: defaultVodStatus,
        vod_letter: vodLetter,
        vod_color: '',
        vod_tag: '',
        vod_class: typeName,
        vod_pic: vodPic,
        vod_pic_thumb: '',
        vod_pic_slide: '',
        vod_pic_screenshot: '',
        vod_actor: vodActor,
        vod_director: vodDirector,
        vod_writer: vodWriter,
        vod_behind: '',
        vod_blurb: '',
        vod_remarks: vodRemarks,
        vod_pubdate: vodPubdate,
        vod_total: 0,
        vod_serial: '0',
        vod_tv: '',
        vod_weekday: '',
        vod_area: vodArea,
        vod_lang: vodLang,
        vod_year: vodYear,
        vod_version: '',
        vod_state: '',
        vod_author: '',
        vod_jumpurl: '',
        vod_tpl: '',
        vod_tpl_play: '',
        vod_tpl_down: '',
        vod_isend: 0,
        vod_lock: 0,
        vod_level: 0,
        vod_copyright: 0,
        vod_points: 0,
        vod_points_play: 0,
        vod_points_down: 0,
        vod_hits: hits,
        vod_hits_day: 0,
        vod_hits_week: 0,
        vod_hits_month: 0,
        vod_duration: vodDuration,
        vod_up: up,
        vod_down: down,
        vod_score: score,
        vod_score_all: 0,
        vod_score_num: 0,
        vod_time: created,
        vod_time_add: created,
        vod_time_hits: 0,
        vod_time_make: 0,
        vod_trysee: 0,
        vod_douban_id: 0,
        vod_douban_score: 0.0,
        vod_reurl: '',
        vod_rel_vod: '',
        vod_rel_art: '',
        vod_pwd: '',
        vod_pwd_url: '',
        vod_pwd_play: '',
        vod_pwd_play_url: '',
        vod_pwd_down: '',
        vod_pwd_down_url: '',
        vod_content: vodContent,
        vod_down_from: '',
        vod_down_server: '',
        vod_down_note: '',
        vod_down_url: '',
        vod_plot: 0,
        vod_plot_name: '',
        vod_plot_detail: '',
      };

      const columns = Object.keys(insert);
      const placeholders = columns.map(() => '?').join(',');
      const values = columns.map((k) => (insert as any)[k]);

      const [res] = await pool.query<any>(
        `INSERT INTO bb_vod (${columns.map((c) => `\`${c}\``).join(',')}) VALUES (${placeholders})`,
        values,
      );
      const vodId = res.insertId;

      // 处理播放源和剧集
      await this.handlePlaySources(pool, vodId, body.playList || []);

      // 清除缓存
      await this.vodCache.invalidateVodCache(vodId).catch(() => void 0);

      return { code: 1, msg: 'add ok', vod_id: vodId };
    }

    // Update rules
    const updateFields = Array.isArray(collectCfg.updateFields) ? collectCfg.updateFields : ['play', 'remarks', 'pic'];
    const playMode = collectCfg.playUpdateMode === 'replace' ? 'replace' : 'merge';

    const sets: string[] = [];
    const updateParams: any[] = [];

    if (updateFields.includes('pic') && vodPic) {
      sets.push('vod_pic = ?');
      updateParams.push(vodPic);
    }
    if (updateFields.includes('remarks') && vodRemarks) {
      sets.push('vod_remarks = ?');
      updateParams.push(vodRemarks);
    }
    if (updateFields.includes('area') && vodArea) {
      sets.push('vod_area = ?');
      updateParams.push(vodArea);
    }
    if (updateFields.includes('lang') && vodLang) {
      sets.push('vod_lang = ?');
      updateParams.push(vodLang);
    }
    if (updateFields.includes('year') && vodYear) {
      sets.push('vod_year = ?');
      updateParams.push(vodYear);
    }
    if (updateFields.includes('actor') && vodActor) {
      sets.push('vod_actor = ?');
      updateParams.push(vodActor);
    }
    if (updateFields.includes('director') && vodDirector) {
      sets.push('vod_director = ?');
      updateParams.push(vodDirector);
    }
    if (updateFields.includes('content') && vodContent) {
      sets.push('vod_content = ?');
      updateParams.push(vodContent);
    }
    if (updateFields.includes('writer') && body.vod_writer) {
      sets.push('vod_writer = ?');
      updateParams.push(trim(body.vod_writer));
    }
    if (updateFields.includes('pubdate') && body.vod_pubdate) {
      sets.push('vod_pubdate = ?');
      updateParams.push(trim(body.vod_pubdate));
    }
    if (updateFields.includes('duration') && body.vod_duration) {
      sets.push('vod_duration = ?');
      updateParams.push(trim(body.vod_duration));
    }

    sets.push('vod_time = ?');
    updateParams.push(created);
    updateParams.push(existing.vod_id);

    await pool.query(`UPDATE bb_vod SET ${sets.join(', ')} WHERE vod_id=?`, updateParams);

    // 处理播放源和剧集（仅当勾选了"播放地址"更新时）
    if (updateFields.includes('play')) {
      if (playMode === 'replace') {
        // 替换模式：删除旧的播放源和剧集，创建新的
        await pool.query('DELETE FROM bb_vod_episode WHERE vod_id = ?', [existing.vod_id]);
        await pool.query('DELETE FROM bb_vod_source WHERE vod_id = ?', [existing.vod_id]);
      }
      await this.handlePlaySources(pool, existing.vod_id, body.playList || []);
    }

    // 清除缓存
    await this.vodCache.invalidateVodCache(existing.vod_id).catch(() => void 0);

    return { code: 2, msg: 'update ok', vod_id: existing.vod_id };
  }

  private async handlePlaySources(pool: any, vodId: number, playList: any[]) {
    if (!Array.isArray(playList) || playList.length === 0) {
      return;
    }

    const collectCfg = await this.collectSettings.get();
    const playMode = collectCfg.playUpdateMode === 'replace' ? 'replace' : 'merge';

    for (const source of playList) {
      let playerId = toInt(source.playerId || source.player_id, 0);
      const playerName = trim(source.playerName || source.player_name);
      const sourceSort = toInt(source.sort, 0);

      if (!playerId && !playerName) continue;

      // 如果没有 playerId，根据 playerName 查找
      if (!playerId && playerName) {
        const [playerRows] = (await (pool as any).query(
          'SELECT id FROM bb_player WHERE from_key = ? AND status = 1 LIMIT 1',
          [playerName],
        )) as any[];
        if (playerRows?.[0]?.id) {
          playerId = playerRows[0].id;
        }
      }

      // 创建或获取播放源
      let sourceId: number;
      if (playerId > 0) {
        const [existing] = (await (pool as any).query(
          'SELECT id FROM bb_vod_source WHERE vod_id = ? AND player_id = ? LIMIT 1',
          [vodId, playerId],
        )) as any[];
        if (existing?.[0]?.id) {
          sourceId = existing[0].id;
        } else {
          const [res] = (await (pool as any).query(
            'INSERT INTO bb_vod_source (vod_id, player_id, player_name, sort) VALUES (?, ?, ?, ?)',
            [vodId, playerId, playerName, sourceSort],
          )) as any[];
          sourceId = res.insertId;
        }
      } else {
        const [res] = (await (pool as any).query(
          'INSERT INTO bb_vod_source (vod_id, player_id, player_name, sort) VALUES (?, ?, ?, ?)',
          [vodId, 0, playerName, sourceSort],
        )) as any[];
        sourceId = res.insertId;
      }

      // 处理剧集
      const episodes = source.episodes || [];
      if (Array.isArray(episodes)) {
        if (playMode === 'replace') {
          // Replace 模式：删除旧剧集，插入新的
          await (pool as any).query(
            'DELETE FROM bb_vod_episode WHERE vod_id = ? AND source_id = ?',
            [vodId, sourceId],
          );
        }

        for (const ep of episodes) {
          const epNum = toInt(ep.num || ep.episode_num, 0);
          const epTitle = trim(ep.title);
          const epUrl = trim(ep.url);

          if (!epUrl) continue;

          if (playMode === 'merge') {
            // Merge 模式：更新或插入（不删除未推送的剧集）
            await (pool as any).query(
              `INSERT INTO bb_vod_episode (vod_id, source_id, episode_num, title, url, sort)
               VALUES (?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE title=VALUES(title), url=VALUES(url), sort=VALUES(sort)`,
              [vodId, sourceId, epNum, epTitle, epUrl, toInt(ep.sort, 0)],
            );
          } else {
            // Replace 模式：直接插入
            await (pool as any).query(
              'INSERT INTO bb_vod_episode (vod_id, source_id, episode_num, title, url, sort) VALUES (?, ?, ?, ?, ?, ?)',
              [vodId, sourceId, epNum, epTitle, epUrl, toInt(ep.sort, 0)],
            );
          }
        }
      }
    }
  }

  private buildPlayListFromLegacy(playFromStr: string, playUrlStr: string): any[] {
    const playList: any[] = [];
    const playFroms = String(playFromStr || '').trim().split('$$$').filter(Boolean);
    const playUrls = String(playUrlStr || '').trim().split('$$$').filter(Boolean);

    for (let i = 0; i < playFroms.length; i++) {
      const playerName = playFroms[i].trim();
      const urlStr = playUrls[i]?.trim() || '';

      if (!playerName || !urlStr) continue;

      const episodes = urlStr.split('#').map((ep, idx) => {
        const [title, url] = ep.split('$');
        return {
          episode_num: idx + 1,
          title: title?.trim() || `第${idx + 1}集`,
          url: url?.trim() || '',
          sort: idx,
        };
      }).filter((ep) => ep.url);

      if (episodes.length > 0) {
        playList.push({
          player_name: playerName,
          episodes,
        });
      }
    }

    return playList;
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
      const dir = path.join(dataDir, 'uploads', 'vodpic');
      await fs.mkdir(dir, { recursive: true });
      const filename = `${hash}.${ext}`;
      const full = path.join(dir, filename);
      try {
        await fs.access(full);
      } catch {
        await fs.writeFile(full, buf);
      }
      return `/uploads/vodpic/${filename}`;
    } catch {
      return imgUrl;
    }
  }
}
