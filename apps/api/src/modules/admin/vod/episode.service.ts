import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';
import { VodQueryCacheService } from '../../../cache/vod-query-cache.service';

/**
 * 剧集数据服务
 * 处理 vod_play_url 格式与规范化表之间的转换
 */
@Injectable()
export class EpisodeService {
  constructor(
    private readonly db: MySQLService,
    private readonly vodCache: VodQueryCacheService,
  ) {}

  /**
   * 解析 MacCMS 格式的播放地址
   * 格式: 播放器1$第1集$url1#第2集$url2$$播放器2$第1集$url3#第2集$url4
   */
  parsePlayUrl(playFrom: string, playUrl: string): Array<{
    playerName: string;
    episodes: Array<{ title: string; url: string }>;
  }> {
    if (!playFrom || !playUrl) return [];

    const players = playFrom.split('$$$');
    const urlGroups = playUrl.split('$$$');
    const result: Array<{ playerName: string; episodes: Array<{ title: string; url: string }> }> = [];

    for (let i = 0; i < players.length; i++) {
      const playerName = players[i]?.trim();
      const urlGroup = urlGroups[i] || '';
      if (!playerName) continue;

      const episodes: Array<{ title: string; url: string }> = [];
      const parts = urlGroup.split('#').filter(Boolean);

      for (const part of parts) {
        const [title, url] = part.split('$');
        if (url) {
          episodes.push({ title: title || '', url });
        }
      }

      result.push({ playerName, episodes });
    }

    return result;
  }

  /**
   * 序列化为 MacCMS 格式
   */
  serializePlayUrl(sources: Array<{
    playerName: string;
    episodes: Array<{ title: string; url: string }>;
  }>): { playFrom: string; playUrl: string } {
    const playFromParts: string[] = [];
    const playUrlParts: string[] = [];

    for (const source of sources) {
      playFromParts.push(source.playerName);
      const episodeParts = source.episodes.map((e) => `${e.title}$${e.url}`);
      playUrlParts.push(episodeParts.join('#'));
    }

    return {
      playFrom: playFromParts.join('$$$'),
      playUrl: playUrlParts.join('$$$'),
    };
  }

  /**
   * 从规范化表获取视频的播放源和剧集
   */
  async getEpisodes(vodId: number) {
    const pool = this.db.getPool();

    const [sources] = await pool.query<any[]>(
      `SELECT id, player_id, player_name, sort FROM bb_vod_source WHERE vod_id = ? ORDER BY sort ASC, id ASC`,
      [vodId],
    );

    const result: Array<{
      sourceId: number;
      playerId: number;
      playerName: string;
      episodes: Array<{ id: number; episodeNum: number; title: string; url: string }>;
    }> = [];

    for (const source of sources || []) {
      const [episodes] = await pool.query<any[]>(
        `SELECT id, episode_num, title, url FROM bb_vod_episode WHERE source_id = ? ORDER BY sort ASC, episode_num ASC, id ASC`,
        [source.id],
      );

      result.push({
        sourceId: source.id,
        playerId: source.player_id,
        playerName: source.player_name,
        episodes: (episodes || []).map((e) => ({
          id: e.id,
          episodeNum: e.episode_num,
          title: e.title,
          url: e.url,
        })),
      });
    }

    return result;
  }

  /**
   * 保存视频的播放源和剧集到规范化表
   */
  async saveEpisodes(
    vodId: number,
    sources: Array<{
      playerId: number;
      playerName: string;
      episodes: Array<{ title: string; url: string }>;
    }>,
  ) {
    const pool = this.db.getPool();
    const now = Math.floor(Date.now() / 1000);

    // 删除旧数据
    await pool.query('DELETE FROM bb_vod_episode WHERE vod_id = ?', [vodId]);
    await pool.query('DELETE FROM bb_vod_source WHERE vod_id = ?', [vodId]);

    // 插入新数据
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const [sourceRes] = await pool.query<any>(
        `INSERT INTO bb_vod_source (vod_id, player_id, player_name, sort, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
        [vodId, source.playerId, source.playerName, i, now, now],
      );
      const sourceId = sourceRes.insertId;

      for (let j = 0; j < source.episodes.length; j++) {
        const ep = source.episodes[j];
        await pool.query(
          `INSERT INTO bb_vod_episode (vod_id, source_id, episode_num, title, url, sort, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`,
          [vodId, sourceId, j + 1, ep.title, ep.url, j, now, now],
        );
      }
    }

    // 清除缓存
    await this.vodCache.invalidateVodCache(vodId).catch(() => void 0);

    return { ok: true };
  }

  /**
   * 同步单个视频：从 vod_play_url 同步到规范化表
   * @deprecated 已弃用 - 旧字段已删除，使用 saveEpisodes 代替
   */
  async syncVodToNormalized(vodId: number) {
    return { ok: false, message: '此方法已弃用，请使用 saveEpisodes 代替' };
  }

  /**
   * 同步单个视频：从规范化表同步回 vod_play_url
   * @deprecated 已弃用 - 旧字段已删除
   */
  async syncVodFromNormalized(vodId: number) {
    return { ok: false, message: '此方法已弃用 - 旧字段已删除' };
  }

  /**
   * 批量同步所有视频到规范化表
   */
  async syncAllToNormalized(batchSize = 100) {
    const pool = this.db.getPool();

    const [countRows] = await pool.query<any[]>('SELECT COUNT(*) as cnt FROM bb_vod');
    const total = Number(countRows?.[0]?.cnt || 0);

    let processed = 0;
    let offset = 0;

    while (offset < total) {
      const [vods] = await pool.query<any[]>(
        'SELECT vod_id FROM bb_vod ORDER BY vod_id ASC LIMIT ? OFFSET ?',
        [batchSize, offset],
      );

      for (const vod of vods || []) {
        await this.syncVodToNormalized(vod.vod_id);
        processed++;
      }

      offset += batchSize;
    }

    return { ok: true, processed, total };
  }
}
