import { Module } from '@nestjs/common';
import { TopicsController } from './controllers/topics.controller';
import { TopicsService } from './services/topics.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';
import { SessionSettings } from './entities/session-settings.entity';
import { SessionSettingsController } from './controllers/session-settings.controller';
import { SessionSettingsService } from './services/session-settings.service';
import { Log } from './entities/log.entity';
import { LoggerService } from './services/logger.service';
import { LogsController } from './controllers/logs.controller';
import { LogsService } from './services/logs.service';
import { ImportJobsController } from './controllers/import-jobs.controller';
import { ImportJobsService } from './services/import-jobs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionSettings,
      Log,
      Topic
    ]),
  ],
  controllers: [
    SessionSettingsController,
    TopicsController,
    LogsController,
    ImportJobsController,
  ],
  providers: [
    SessionSettingsService,
    LoggerService,
    LogsService,
    TopicsService,
    ImportJobsService,
  ],
  exports: [
    SessionSettingsService,
    LoggerService,
    TopicsService,
    ImportJobsService,
  ]
})
export class CommonModule {}
