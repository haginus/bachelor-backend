import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Committee } from './entities/committee.entity';
import { CommitteeMember } from './entities/committee-member.entity';
import { CommitteeActivityDay } from './entities/committee-activity-day.entity';
import { PaperGrade } from './entities/paper-grade.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Committee,
      CommitteeMember,
      CommitteeActivityDay,
      PaperGrade,
    ]),
  ],
})
export class GradingModule {}
