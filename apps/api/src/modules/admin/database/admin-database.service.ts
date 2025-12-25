import { BadRequestException, Injectable } from '@nestjs/common';
import { MySQLService } from '../../../db/mysql.service';

@Injectable()
export class AdminDatabaseService {
  constructor(private readonly db: MySQLService) {}

  /**
   * 获取所有表信息
   */
  async listTables() {
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>('SHOW TABLE STATUS');
    return {
      items: (rows || []).map((r) => ({
        name: r.Name,
        engine: r.Engine,
        rows: r.Rows,
        dataLength: r.Data_length,
        indexLength: r.Index_length,
        autoIncrement: r.Auto_increment,
        createTime: r.Create_time,
        updateTime: r.Update_time,
        collation: r.Collation,
      })),
    };
  }

  /**
   * 获取表结构
   */
  async describeTable(tableName: string) {
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new BadRequestException('表名无效');
    }
    const pool = this.db.getPool();
    const [rows] = await pool.query<any[]>(`DESCRIBE \`${tableName}\``);
    return { columns: rows || [] };
  }

  /**
   * 批量替换数据
   */
  async batchReplace(input: {
    table: string;
    field: string;
    search: string;
    replace: string;
    where?: string;
  }) {
    const { table, field, search, replace, where } = input;

    if (!table || !/^[a-zA-Z0-9_]+$/.test(table)) {
      throw new BadRequestException('表名无效');
    }
    if (!field || !/^[a-zA-Z0-9_]+$/.test(field)) {
      throw new BadRequestException('字段名无效');
    }
    if (!search) {
      throw new BadRequestException('搜索内容不能为空');
    }

    const pool = this.db.getPool();

    // 先统计影响行数
    let countSql = `SELECT COUNT(*) as cnt FROM \`${table}\` WHERE \`${field}\` LIKE ?`;
    const countParams: any[] = [`%${search}%`];
    if (where) {
      countSql += ` AND (${where})`;
    }
    const [countRows] = await pool.query<any[]>(countSql, countParams);
    const affected = Number(countRows?.[0]?.cnt || 0);

    if (affected === 0) {
      return { ok: true, affected: 0, message: '没有找到匹配的数据' };
    }

    // 执行替换
    let updateSql = `UPDATE \`${table}\` SET \`${field}\` = REPLACE(\`${field}\`, ?, ?) WHERE \`${field}\` LIKE ?`;
    const updateParams: any[] = [search, replace, `%${search}%`];
    if (where) {
      updateSql += ` AND (${where})`;
    }
    const [result] = await pool.query<any>(updateSql, updateParams);

    return { ok: true, affected: result.affectedRows || affected, message: `成功替换 ${result.affectedRows || affected} 条数据` };
  }

  /**
   * 执行 SQL 查询（只读）
   */
  async executeQuery(sql: string) {
    if (!sql?.trim()) {
      throw new BadRequestException('SQL 不能为空');
    }

    const trimmed = sql.trim().toLowerCase();
    // 只允许 SELECT 查询
    if (!trimmed.startsWith('select')) {
      throw new BadRequestException('只允许执行 SELECT 查询');
    }

    // 禁止危险操作
    const forbidden = ['drop', 'truncate', 'delete', 'update', 'insert', 'alter', 'create', 'grant', 'revoke'];
    for (const word of forbidden) {
      if (trimmed.includes(word)) {
        throw new BadRequestException(`禁止执行包含 ${word.toUpperCase()} 的语句`);
      }
    }

    const pool = this.db.getPool();
    const startTime = Date.now();
    const [rows] = await pool.query<any[]>(sql);
    const duration = Date.now() - startTime;

    return {
      ok: true,
      rows: rows || [],
      rowCount: (rows || []).length,
      duration,
    };
  }

  /**
   * 执行 SQL 更新（危险操作，需要确认）
   */
  async executeUpdate(sql: string, confirmed: boolean) {
    if (!sql?.trim()) {
      throw new BadRequestException('SQL 不能为空');
    }
    if (!confirmed) {
      throw new BadRequestException('请确认执行此操作');
    }

    const trimmed = sql.trim().toLowerCase();

    // 禁止最危险的操作
    const forbidden = ['drop database', 'truncate', 'grant', 'revoke'];
    for (const word of forbidden) {
      if (trimmed.includes(word)) {
        throw new BadRequestException(`禁止执行 ${word.toUpperCase()} 操作`);
      }
    }

    const pool = this.db.getPool();
    const startTime = Date.now();
    const [result] = await pool.query<any>(sql);
    const duration = Date.now() - startTime;

    return {
      ok: true,
      affectedRows: result.affectedRows || 0,
      changedRows: result.changedRows || 0,
      insertId: result.insertId || 0,
      duration,
    };
  }

  /**
   * 优化表
   */
  async optimizeTable(tableName: string) {
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new BadRequestException('表名无效');
    }
    const pool = this.db.getPool();
    await pool.query(`OPTIMIZE TABLE \`${tableName}\``);
    return { ok: true, message: `表 ${tableName} 优化完成` };
  }

  /**
   * 修复表
   */
  async repairTable(tableName: string) {
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new BadRequestException('表名无效');
    }
    const pool = this.db.getPool();
    await pool.query(`REPAIR TABLE \`${tableName}\``);
    return { ok: true, message: `表 ${tableName} 修复完成` };
  }

  /**
   * 批量优化所有表
   */
  async optimizeAllTables() {
    const pool = this.db.getPool();
    const [tables] = await pool.query<any[]>('SHOW TABLES');
    const tableNames = tables.map((t) => Object.values(t)[0] as string);

    for (const name of tableNames) {
      await pool.query(`OPTIMIZE TABLE \`${name}\``);
    }

    return { ok: true, message: `已优化 ${tableNames.length} 个表` };
  }

  /**
   * 清空表数据
   */
  async truncateTable(tableName: string, confirmed: boolean) {
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new BadRequestException('表名无效');
    }
    if (!confirmed) {
      throw new BadRequestException('请确认清空操作');
    }

    // 禁止清空核心表
    const protected_tables = ['bb_admin', 'bb_setting'];
    if (protected_tables.includes(tableName)) {
      throw new BadRequestException('禁止清空此表');
    }

    const pool = this.db.getPool();
    await pool.query(`TRUNCATE TABLE \`${tableName}\``);
    return { ok: true, message: `表 ${tableName} 已清空` };
  }
}
