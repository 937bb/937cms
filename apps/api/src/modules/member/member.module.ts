import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { PublicModule } from '../public/public.module';
import { MemberAuthModule } from './member-auth.module';
import { MemberAuthController } from './member-auth.controller';
import { MemberAuthService } from './member-auth.service';
import { MemberMeController } from './member-me.controller';
import { MemberUserController } from './member-user.controller';
import { MemberUserService } from './member-user.service';

@Module({
  imports: [ConfigModule, PublicModule, MemberAuthModule],
  controllers: [MemberAuthController, MemberMeController, MemberUserController],
  providers: [MemberAuthService, MemberUserService],
  exports: [MemberAuthModule],
})
export class MemberModule {}
