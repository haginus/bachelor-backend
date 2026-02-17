import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Committee } from './entities/committee.entity';
import { CommitteeMember } from './entities/committee-member.entity';
import { CommitteeActivityDay } from './entities/committee-activity-day.entity';
import { PaperGrade } from './entities/paper-grade.entity';
import { CommitteesController } from './controllers/committees.controller';
import { CommitteesService } from './services/committees.service';
import { UsersModule } from '../users/users.module';
import { DocumentGenerationModule } from '../document-generation/document-generation.module';
import { CommonModule } from '../common/common.module';
import { PaperAutoAssignService } from './services/paper-auto-assign.service';
import { Submission } from './entities/submission.entity';

@Module({
  imports: [
    CommonModule,
    UsersModule,
    DocumentGenerationModule,
    TypeOrmModule.forFeature([
      Submission,
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
    CommitteesService,
    PaperAutoAssignService,
  ],
})
export class GradingModule {}
