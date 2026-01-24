import { Module } from '@nestjs/common';
import { TopicsController } from './controllers/topics.controller';
import { TopicsService } from './services/topics.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';
import { SessionSettings } from './entities/session-settings.entity';
import { SessionSettingsController } from './controllers/session-settings.controller';
import { SessionSettingsService } from './services/session-settings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionSettings,
      Topic
    ]),
  ],
  controllers: [
    SessionSettingsController,
    TopicsController
  ],
  providers: [
    SessionSettingsService,
    TopicsService
  ],
  exports: [
    SessionSettingsService,
    TopicsService
  ]
})
export class CommonModule {}
