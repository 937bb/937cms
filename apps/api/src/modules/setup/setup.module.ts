import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

@Module({
  imports: [ConfigModule],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}

