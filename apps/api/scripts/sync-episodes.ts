/**
 * 剧集数据同步脚本
 * 将 vod_play_url 数据同步到规范化表 bb_vod_source / bb_vod_episode
 *
 * 使用方法：
 * cd apps/api && npx ts-node scripts/sync-episodes.ts
 */

import * as mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

// 读取配置
function loadConfig() {
  const dataDir = process.env.CMS_DATA_DIR || path.join(process.cwd(), 'data');
  const configPath = path.join(dataDir, 'runtime-config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('配置文件不存在: ' + configPath);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// 解析 MacCMS 格式的播放地址
function parsePlayUrl(playFrom: string, playUrl: string): Array<{
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

async function main() {
  console.log('开始同步剧集数据...');

  const config = loadConfig();
  const dbConfig = config.mysql;
  if (!dbConfig) {
    throw new Error('数据库配置不存在');
  }

  const conn = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  try {
    // 1. 运行迁移创建表
    console.log('检查并创建表...');
    const migrationPath = path.join(__dirname, '../sql/migrations/010_add_episode_tables.sql');
    if (fs.existsSync(migrationPath)) {
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      await conn.query(migrationSql);
      console.log('表创建完成');
    }

    // 2. 获取播放器映射
    const [players] = await conn.query<any[]>('SELECT id, from_key FROM bb_player');
    const playerMap = new Map<string, number>();
    for (const p of players || []) {
      playerMap.set(p.from_key, p.id);
    }
    console.log(`加载了 ${playerMap.size} 个播放器`);

    // 3. 获取视频总数
    const [countRows] = await conn.query<any[]>('SELECT COUNT(*) as cnt FROM bb_vod');
    const total = Number(countRows?.[0]?.cnt || 0);
    console.log(`共有 ${total} 个视频需要同步`);

    if (total === 0) {
      console.log('没有视频数据，退出');
      return;
    }

    // 4. 清空旧数据
    console.log('清空旧的规范化数据...');
    await conn.query('TRUNCATE TABLE bb_vod_episode');
    await conn.query('TRUNCATE TABLE bb_vod_source');

    // 5. 批量同步
    const batchSize = 100;
    let processed = 0;
    let offset = 0;
    const now = Math.floor(Date.now() / 1000);

    while (offset < total) {
      const [vods] = await conn.query<any[]>(
        'SELECT vod_id, vod_play_from, vod_play_url FROM bb_vod ORDER BY vod_id ASC LIMIT ? OFFSET ?',
        [batchSize, offset]
      );

      for (const vod of vods || []) {
        const parsed = parsePlayUrl(vod.vod_play_from || '', vod.vod_play_url || '');

        for (let i = 0; i < parsed.length; i++) {
          const source = parsed[i];
          const playerId = playerMap.get(source.playerName) || 0;

          // 插入播放源
          const [sourceRes] = await conn.query<any>(
            `INSERT INTO bb_vod_source (vod_id, player_id, player_name, sort, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
            [vod.vod_id, playerId, source.playerName, i, now, now]
          );
          const sourceId = sourceRes.insertId;

          // 批量插入剧集
          if (source.episodes.length > 0) {
            const values = source.episodes.map((ep, j) => [
              vod.vod_id, sourceId, j + 1, ep.title, ep.url, j, now, now
            ]);
            await conn.query(
              `INSERT INTO bb_vod_episode (vod_id, source_id, episode_num, title, url, sort, created_at, updated_at) VALUES ?`,
              [values]
            );
          }
        }

        processed++;
      }

      offset += batchSize;
      console.log(`进度: ${processed}/${total} (${((processed / total) * 100).toFixed(1)}%)`);
    }

    console.log(`\n同步完成！共处理 ${processed} 个视频`);

    // 6. 统计结果
    const [sourceCount] = await conn.query<any[]>('SELECT COUNT(*) as cnt FROM bb_vod_source');
    const [episodeCount] = await conn.query<any[]>('SELECT COUNT(*) as cnt FROM bb_vod_episode');
    console.log(`播放源: ${sourceCount?.[0]?.cnt || 0} 条`);
    console.log(`剧集: ${episodeCount?.[0]?.cnt || 0} 条`);

  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('同步失败:', e);
  process.exit(1);
});
