import { DynamicModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { AdminModule } from './modules/admin/admin.module';
import { PublicModule } from './modules/public/public.module';
import { ReceiveModule } from './modules/receive/receive.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { MemberModule } from './modules/member/member.module';
import { CollectModule } from './modules/collect/collect.module';
import { SetupModule } from './modules/setup/setup.module';
import { ConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  static forRoot(opts: { configured: boolean }): DynamicModule {
    const baseImports = [CommonModule, ConfigModule, RateLimitModule, SetupModule];
    if (!opts.configured) {
      return {
        module: AppModule,
        imports: baseImports,
      };
    }

    return {
      module: AppModule,
      imports: [CommonModule, ConfigModule, DbModule, RateLimitModule, SetupModule, AdminModule, PublicModule, ReceiveModule, MemberModule, CollectModule],
    };
  }
}
