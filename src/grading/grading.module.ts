import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Committee } from './entities/committee.entity';
import { CommitteeMember } from './entities/committee-member.entity';
import { CommitteeActivityDay } from './entities/committee-activity-day.entity';
import { PaperGrade } from './entities/paper-grade.entity';
import { CommitteesController } from './controllers/committees.controller';
import { CommitteesService } from './services/committees.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([
      Committee,
      CommitteeMember,
      CommitteeActivityDay,
      PaperGrade,
    ]),
  ],
  controllers: [
    CommitteesController
  ],
  providers: [
    CommitteesService
  ],
})
export class GradingModule {}
