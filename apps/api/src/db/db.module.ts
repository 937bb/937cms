import { Global, Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { MySQLService } from './mysql.service';
import { MigrationService } from './migration.service';

/**
 * 数据库模块
 * 提供 MySQL 连接和自动迁移功能
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [MySQLService, MigrationService],
  exports: [MySQLService, MigrationService],
})
export class DbModule implements OnModuleInit {
  private readonly logger = new Logger(DbModule.name);

  constructor(private readonly migration: MigrationService) {}

  async onModuleInit() {
    try {
      await this.migration.runMigrations();
    } catch (error) {
      this.logger.warn('Failed to run migrations on module init', error);
    }
  }
}
