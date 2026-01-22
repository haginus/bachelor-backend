import { Module } from '@nestjs/common';
import { TopicsController } from './controllers/topics.controller';
import { TopicsService } from './services/topics.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Topic]),
  ],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class CommonModule {}
