import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly db: MySQLService) {}

  async getStats() {
    const pool = this.db.getPool();
    const now = Math.floor(Date.now() / 1000);
    const today = Math.floor(now / 86400) * 86400;
    const sevenDaysAgo = now - 604800;

    // 总视频数
    const [totalVods] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM bb_vod'
    );

    // 今日新增视频
    const [todayNewVods] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM bb_vod WHERE vod_time_add >= ?',
      [today]
    );

    // 今日更新视频
    const [todayUpdatedVods] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM bb_vod WHERE vod_time >= ?',
      [today]
    );

    // 总分类数
    const [totalTypes] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM bb_type'
    );

    // 今日播放量
    const [todayPlays] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM bb_member_play_history WHERE created_at >= ?',
      [today]
    );

    // 今日访问用户数
    const [todayUsers] = await pool.query<any[]>(
      'SELECT COUNT(DISTINCT member_id) as count FROM bb_member_play_history WHERE created_at >= ?',
      [today]
    );

    // 总用户数
    const [totalUsers] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM bb_member'
    );

    // 总收藏数
    const [totalFavorites] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM bb_member_favorite'
    );

    // 最近7天播放趋势
    const [playTrend] = await pool.query<any[]>(
      `SELECT
        DATE_FORMAT(FROM_UNIXTIME(created_at), '%Y-%m-%d') as date,
        COUNT(*) as count
      FROM bb_member_play_history
      WHERE created_at >= ?
      GROUP BY DATE_FORMAT(FROM_UNIXTIME(created_at), '%Y-%m-%d')
      ORDER BY date DESC
      LIMIT 7`,
      [sevenDaysAgo]
    );

    // 最近采集任务统计
    const [recentCollects] = await pool.query<any[]>(
      `SELECT
        status,
        COUNT(*) as count,
        SUM(pushed_count) as total_pushed,
        SUM(error_count) as total_errors
      FROM bb_collect_run
      WHERE created_at >= ?
      GROUP BY status`,
      [sevenDaysAgo]
    );

    return {
      vods: {
        total: totalVods[0]?.count || 0,
        todayNew: todayNewVods[0]?.count || 0,
        todayUpdated: todayUpdatedVods[0]?.count || 0,
      },
      types: {
        total: totalTypes[0]?.count || 0,
      },
      plays: {
        today: todayPlays[0]?.count || 0,
        trend: playTrend || [],
      },
      users: {
        total: totalUsers[0]?.count || 0,
        todayActive: todayUsers[0]?.count || 0,
      },
      favorites: {
        total: totalFavorites[0]?.count || 0,
      },
      collects: recentCollects || [],
    };
  }
}
