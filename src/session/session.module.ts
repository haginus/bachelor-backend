import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionSettingsController } from './session-settings.controller';
import { SessionSettingsService } from './session-settings.service';
import { SessionSettings } from './session-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionSettings]),
  ],
  controllers: [SessionSettingsController],
  providers: [SessionSettingsService],
  exports: [SessionSettingsService],
})
export class SessionModule {}
