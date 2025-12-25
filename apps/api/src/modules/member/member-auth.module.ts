import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '../../config/config.module';
import { RuntimeConfigService } from '../../config/runtime-config.service';
import { MemberJwtStrategy } from './member-jwt.strategy';
import { MemberOptionalGuard } from './member-optional.guard';
import { MemberGuard } from './member.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      global: false,
      imports: [ConfigModule],
      inject: [RuntimeConfigService],
      useFactory: (cfg: RuntimeConfigService) => ({
        secret: cfg.require().security.memberJwtSecret,
        signOptions: { expiresIn: '30d' as any },
      }),
    }),
  ],
  providers: [MemberJwtStrategy, MemberGuard, MemberOptionalGuard],
  exports: [JwtModule, MemberGuard, MemberOptionalGuard],
})
export class MemberAuthModule {}
