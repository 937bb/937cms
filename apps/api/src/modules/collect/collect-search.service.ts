import { BadRequestException, Injectable } from '@nestjs/common';
import { MySQLService } from '../../db/mysql.service';
import { RuntimeConfigService } from '../../config/runtime-config.service';
import { ReceiveVodService } from '../receive/vod/receive-vod.service';
import { SystemSettingsService } from '../admin/system/system-settings.service';

interface SourceInfo {
  id: number;
  name: string;
  base_url: string;
  collect_type: number;
}

interface SearchResultItem {
  source_id: number;
  source_name: string;
  vod_id: number;
  vod_name: string;
  vod_pic?: string;
  vod_remarks?: string;
  vod_year?: string;
  vod_area?: string;
  type_name?: string;
  vod_play_from?: string;
  vod_actor?: string;
  vod_director?: string;
  vod_writer?: string;
  vod_pubdate?: string;
  vod_duration?: string;
}

export interface SearchResult {
  source_id: number;
  source_name: string;
  items: SearchResultItem[];
  error?: string;
}

@Injectable()
export class CollectSearchService {
  constructor(
    private readonly db: MySQLService,
    private readonly cfg: RuntimeConfigService,
    private readonly receiveVod: ReceiveVodService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  async searchVideos(keyword: string, sourceIds: number[]): Promise<{ results: SearchResult[] }> {
    const kw = String(keyword || '').trim();
    if (!kw) throw new BadRequestException('keyword required');

    const pool = this.db.getPool();
    let sources: SourceInfo[] = [];

    if (sourceIds.length > 0) {
      const placeholders = sourceIds.map(() => '?').join(',');
      const [rows] = await pool.query<any[]>(
        `SELECT id, name, base_url, collect_type FROM bb_collect_source WHERE id IN (${placeholders}) AND status = 1`,
        sourceIds,
      );
      sources = rows || [];
    } else {
      const [rows] = await pool.query<any[]>(
        'SELECT id, name, base_url, collect_type FROM bb_collect_source WHERE status = 1',
      );
      sources = rows || [];
    }

    if (!sources.length) {
      return { results: [] };
    }

    const results: SearchResult[] = await Promise.all(
      sources.map((src) => this.searchFromSource(src, kw)),
    );

    return { results };
  }

  private async searchFromSource(source: SourceInfo, keyword: string): Promise<SearchResult> {
    const result: SearchResult = {
      source_id: source.id,
      source_name: source.name,
      items: [],
    };

    try {
      // 使用 ac=videolist 获取更多信息包括线路
      const url = `${source.base_url}/api.php/provide/vod/?ac=videolist&wd=${encodeURIComponent(keyword)}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': '937cms-collector/1.0' },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        result.error = `HTTP ${response.status}`;
        return result;
      }

      const data = await response.json();
      const list = data?.list || [];

      result.items = list.map((item: any) => ({
        source_id: source.id,
        source_name: source.name,
        vod_id: Number(item.vod_id) || 0,
        vod_name: String(item.vod_name || ''),
        vod_pic: String(item.vod_pic || ''),
        vod_remarks: String(item.vod_remarks || ''),
        vod_year: String(item.vod_year || ''),
        vod_area: String(item.vod_area || ''),
        type_name: String(item.type_name || ''),
        vod_play_from: String(item.vod_play_from || ''),
        vod_actor: String(item.vod_actor || ''),
        vod_director: String(item.vod_director || ''),
        vod_writer: String(item.vod_writer || ''),
        vod_pubdate: String(item.vod_pubdate || ''),
        vod_duration: String(item.vod_duration || ''),
      }));
    } catch (e: any) {
      result.error = e.message || 'fetch failed';
    }

    return result;
  }

  async collectSingleVideo(sourceId: number, vodId: number): Promise<{ ok: boolean; message: string }> {
    if (!sourceId || !vodId) throw new BadRequestException('source_id and vod_id required');

    const pool = this.db.getPool();
    const [srcRows] = await pool.query<any[]>(
      'SELECT id, name, base_url, collect_type FROM bb_collect_source WHERE id = ? LIMIT 1',
      [sourceId],
    );
    const source = srcRows?.[0];
    if (!source) throw new BadRequestException('source not found');

    try {
      const url = `${source.base_url}/api.php/provide/vod/?ac=detail&ids=${vodId}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': '937cms-collector/1.0' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return { ok: false, message: `HTTP ${response.status}` };
      }

      const data = await response.json();
      const list = data?.list || [];
      if (!list.length) {
        return { ok: false, message: '视频不存在' };
      }

      const vod = list[0];

      // 使用 ReceiveVodService 进行入库，与采集任务使用相同的逻辑
      const sys = await this.systemSettings.get();
      const pass = String(sys.interfacePass || this.cfg.require().security.interfacePass).trim();

      const result = await this.receiveVod.receiveVod({
        pass,
        source_id: sourceId,
        type_id: vod.type_id,
        type_name: vod.type_name,
        vod_name: vod.vod_name,
        vod_pic: vod.vod_pic,
        vod_remarks: vod.vod_remarks,
        vod_year: vod.vod_year,
        vod_area: vod.vod_area,
        vod_lang: vod.vod_lang,
        vod_actor: vod.vod_actor,
        vod_director: vod.vod_director,
        vod_content: vod.vod_content,
        vod_writer: vod.vod_writer,
        vod_pubdate: vod.vod_pubdate,
        vod_duration: vod.vod_duration,
        playList: this.parsePlayList(vod),
      });

      if (result.code === 1) {
        return { ok: true, message: `已入库: ${vod.vod_name} (ID: ${result.vod_id})` };
      } else if (result.code === 2) {
        return { ok: true, message: `已更新: ${vod.vod_name} (ID: ${result.vod_id})` };
      } else {
        return { ok: false, message: result.msg || '入库失败' };
      }
    } catch (e: any) {
      return { ok: false, message: e.message || 'fetch failed' };
    }
  }

  async collectBatch(items: Array<{ source_id: number; vod_id: number }>): Promise<{ ok: boolean; results: Array<{ source_id: number; vod_id: number; success: boolean; message: string }> }> {
    const results: Array<{ source_id: number; vod_id: number; success: boolean; message: string }> = [];

    for (const item of items) {
      try {
        const res = await this.collectSingleVideo(item.source_id, item.vod_id);
        results.push({
          source_id: item.source_id,
          vod_id: item.vod_id,
          success: res.ok,
          message: res.message,
        });
      } catch (e: any) {
        results.push({
          source_id: item.source_id,
          vod_id: item.vod_id,
          success: false,
          message: e.message || 'error',
        });
      }
    }

    return { ok: true, results };
  }

  private parsePlayList(vod: any): any[] {
    const playList: any[] = [];

    // 解析 vod_play_from 和 vod_play_url
    const playFromStr = String(vod.vod_play_from || '').trim();
    const playUrlStr = String(vod.vod_play_url || '').trim();


    if (!playFromStr || !playUrlStr) {
      return playList;
    }

    // 检查是否是多播放器格式（用 $$$ 分割）或单播放器格式
    const isMultiPlayer = playFromStr.includes('$$$');

    if (isMultiPlayer) {
      // 多播放器格式：播放器1$$$播放器2$$$...
      const playFroms = playFromStr.split('$$$').filter(Boolean);
      const playUrls = playUrlStr.split('$$$').filter(Boolean);

      for (let i = 0; i < playFroms.length; i++) {
        const playerName = playFroms[i].trim();
        const urlStr = playUrls[i]?.trim() || '';

        if (!playerName || !urlStr) continue;

        const episodes = this.parseEpisodes(urlStr);
        if (episodes.length > 0) {
          playList.push({
            player_name: playerName,
            episodes,
          });
        }
      }
    } else {
      // 单播放器格式：直接使用 playFromStr 作为播放器名称
      const playerName = playFromStr;
      const episodes = this.parseEpisodes(playUrlStr);

      if (episodes.length > 0) {
        playList.push({
          player_name: playerName,
          episodes,
        });
      }
    }

    return playList;
  }

  private parseEpisodes(urlStr: string): any[] {
    // 按 # 分割剧集
    return urlStr.split('#').map((ep, idx) => {
      const [title, url] = ep.split('$');
      return {
        episode_num: idx + 1,
        title: title?.trim() || `第${idx + 1}集`,
        url: url?.trim() || '',
        sort: idx,
      };
    }).filter((ep) => ep.url);
  }
}
