import { Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

// 页面权限类型
export type PageType = 'list' | 'detail' | 'play' | 'down';

// 分类权限映射: typeId -> { list, detail, play, down, trysee }
export type TypePopedom = Map<number, { list: boolean; detail: boolean; play: boolean; down: boolean; trysee: boolean }>;

export interface MemberGroupPermission {
  groupId: number;
  level: number;
  pointsFree: boolean;
  popedom: TypePopedom; // 页面级权限
}

/**
 * 解析 popedom 字符串
 * 格式: type_id,1,2,3,4,5|type_id,1,2,3,4,5|...
 * 1=列表页, 2=内容页, 3=播放页, 4=下载页, 5=试看
 */
function parsePopedom(str: string): TypePopedom {
  const result: TypePopedom = new Map();
  if (!str) return result;
  const parts = str.split('|').filter(Boolean);
  for (const p of parts) {
    const [tid, ...perms] = p.split(',');
    const typeId = Number(tid);
    if (!typeId) continue;
    result.set(typeId, {
      list: perms.includes('1'),
      detail: perms.includes('2'),
      play: perms.includes('3'),
      down: perms.includes('4'),
      trysee: perms.includes('5'),
    });
  }
  return result;
}

@Injectable()
export class PublicMemberGroupService {
  private cache = new Map<number, { data: MemberGroupPermission; expireAt: number }>();
  private readonly CACHE_TTL = 60 * 1000; // 1分钟缓存

  constructor(private readonly db: MySQLService) {}

  /**
   * 获取会员组权限
   * @param groupId 会员组ID，0或1表示游客
   */
  async getPermission(groupId: number): Promise<MemberGroupPermission> {
    const gid = groupId || 1; // 默认游客组

    // 检查缓存
    const cached = this.cache.get(gid);
    if (cached && cached.expireAt > Date.now()) {
      return cached.data;
    }

    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id, level, popedom, points_free FROM bb_member_group WHERE id = ? AND status = 1 LIMIT 1',
      [gid],
    );

    let permission: MemberGroupPermission;

    if (rows?.[0]) {
      const row = rows[0];
      permission = {
        groupId: row.id,
        level: Number(row.level) || 0,
        pointsFree: !!row.points_free,
        popedom: parsePopedom(String(row.popedom || '')),
      };
    } else {
      // 默认游客权限（无任何权限）
      permission = {
        groupId: 1,
        level: 0,
        pointsFree: false,
        popedom: new Map(),
      };
    }

    // 更新缓存
    this.cache.set(gid, { data: permission, expireAt: Date.now() + this.CACHE_TTL });

    return permission;
  }

  /**
   * 检查是否可以访问指定分类的指定页面
   * @param permission 会员组权限
   * @param typeId 分类ID
   * @param page 页面类型
   */
  canAccessPage(permission: MemberGroupPermission, typeId: number, page: PageType): boolean {
    const typePerm = permission.popedom.get(typeId);
    if (!typePerm) return false; // 该分类无权限配置 = 无权限
    return typePerm[page];
  }

  /**
   * 检查是否可以试看
   */
  canTrySee(permission: MemberGroupPermission, typeId: number): boolean {
    const typePerm = permission.popedom.get(typeId);
    return typePerm?.trysee ?? false;
  }

  /**
   * 检查是否可以访问指定等级的内容
   * @param permission 会员组权限
   * @param vodLevel 视频要求的等级
   */
  canAccessLevel(permission: MemberGroupPermission, vodLevel: number): boolean {
    if (!vodLevel) return true; // 0 = 无限制
    return permission.level >= vodLevel;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}
