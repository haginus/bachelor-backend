import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Submission } from "../entities/submission.entity";
import { DataSource, Repository } from "typeorm";
import { SubmissionQueryDto } from "../dto/submission-query.dto";
import { Paginated } from "../../lib/interfaces/paginated.interface";
import { User } from "../../users/entities/user.entity";
import { UserType } from "../../lib/enums/user-type.enum";
import { LoggerService } from "../../common/services/logger.service";
import { LogName } from "../../lib/enums/log-name.enum";

@Injectable()
export class SubmissionsService {
 
  constructor(
    @InjectRepository(Submission) private readonly submissionsRepository: Repository<Submission>,
    private readonly dataSource: DataSource,
    private readonly loggerService: LoggerService,
  ) {}

  private getQueryBuilder() {
    return this.submissionsRepository.createQueryBuilder('submission')
      .leftJoinAndSelect('submission.student', 'student')
      .leftJoinAndSelect('student.specialization', 'specialization')
      .leftJoinAndSelect('specialization.domain', 'domain')
      .leftJoinAndSelect('student.paper', 'paper')
      .leftJoinAndSelect('submission.writtenExamGrade', 'writtenExamGrade')
  }

  async findAll(query: SubmissionQueryDto): Promise<Paginated<Submission>> {
    const qb = this.getQueryBuilder();
    if(query.isSubmitted !== undefined) {
      qb.andWhere('submission.isSubmitted = :isSubmitted', { isSubmitted: query.isSubmitted });
    }
    if(query.hasWrittenExam !== undefined) {
      qb.andWhere('domain.hasWrittenExam = :hasWrittenExam', { hasWrittenExam: query.hasWrittenExam });
    }
    if(query.writtenExamState) {
      if(query.writtenExamState === 'graded') {
        qb.andWhere('writtenExamGrade.submissionId IS NOT NULL');
      } else if(query.writtenExamState === 'absent') {
        qb.andWhere('writtenExamGrade.initialGrade = 0');
      } else if(query.writtenExamState === 'not_graded') {
        qb.andWhere('writtenExamGrade.submissionId IS NULL');
      } else if(query.writtenExamState === 'disputed') {
        qb.andWhere('writtenExamGrade.isDisputed = :isDisputed', { isDisputed: true });
      }
    }
    if(query.domainId) {
      qb.andWhere('domain.id = :domainId', { domainId: query.domainId });
    }
    if(query.studentName) {
      qb.andWhere(
        `(CONCAT(student.firstName, ' ', student.lastName) LIKE :search OR CONCAT(student.lastName, ' ', student.firstName) LIKE :search)`,
        { search: `%${query.studentName}%` },
      );
    }
    const count = await qb.getCount();
    qb.take(query.limit).skip(query.offset);
    switch(query.sortBy) {
      case 'student.fullName':
        qb.orderBy('student.lastName', query.sortDirection.toLocaleUpperCase() as any).addOrderBy('student.firstName', query.sortDirection.toLocaleUpperCase() as any);
        break;
      case 'student.domain.name':
        qb.orderBy('domain.name', query.sortDirection.toLocaleUpperCase() as any);
        break;
      case 'writtenExamGrade.initialGrade':
      case 'writtenExamGrade.disputeGrade':
        qb.orderBy(`writtenExamGrade.${query.sortBy.split('.')[1]}`, query.sortDirection.toLocaleUpperCase() as any);
        break;
      case 'writtenExamGrade.finalGrade':
        qb.addSelect('GREATEST(COALESCE(writtenExamGrade.disputeGrade, 0), writtenExamGrade.initialGrade, 0)', '_finalGrade');
        qb.orderBy('_finalGrade', query.sortDirection.toLocaleUpperCase() as any);
        break;
      default:
        qb.orderBy(`submission.${query.sortBy}`, query.sortDirection.toLocaleUpperCase() as any);
    }
    const rows = await qb.getMany();
    return { count, rows };
  }

  async findOne(id: number, user?: User): Promise<Submission> {
    const qb = this.getQueryBuilder();
    qb.andWhere('submission.id = :id', { id });
    const submission = await qb.getOne();
    if(!submission) {
      throw new NotFoundException();
    }
    if(user?.type === UserType.Student && submission.student.id !== user.id) {
      throw new ForbiddenException();
    }
    if(user?.type === UserType.Teacher && submission.student.paper.teacherId !== user.id) {
      throw new ForbiddenException();
    }
    return submission;
  }

  async findOneByStudentId(studentId: number): Promise<Submission> {
    const qb = this.getQueryBuilder();
    qb.andWhere('student.id = :studentId', { studentId });
    const submission = await qb.getOne();
    if(!submission) {
      throw new NotFoundException();
    }
    return submission;
  }

  async exportCsv(): Promise<Buffer> {
    const qb = this.getQueryBuilder();
    qb.andWhere('submission.isSubmitted = 1');
    qb.andWhere('domain.hasWrittenExam = 1');
    qb.addOrderBy('domain.name', 'ASC').addOrderBy('student.lastName', 'ASC').addOrderBy('student.firstName', 'ASC');
    const submissions = await qb.getMany();
    const header = ['ID_INSCRIERE', 'NUME_STUDENT', 'DOMENIU', 'NOTA_INITIALA', 'NOTA_CONTESTATIE'];
    const rows = submissions.map(s => [
      s.id,
      `${s.student.fullName}`,
      s.student.specialization.domain.name,
      s.writtenExamGrade?.initialGrade || '',
      s.writtenExamGrade?.disputeGrade || '',
    ]);
    const csvContent = [header, ...rows].map(e => e.join(',')).join('\n');
    return Buffer.from(csvContent, 'utf-8');
  }

  async getStats(): Promise<{ totalWithWrittenExam: number; notGraded: number; initiallyGraded: number; disputed: number; disputeGraded: number; }> {
    const qb = this.submissionsRepository.createQueryBuilder('submission')
      .leftJoin('submission.student', 'student')
      .leftJoin('student.specialization', 'specialization')
      .leftJoin('specialization.domain', 'domain')
      .leftJoin('student.paper', 'paper')
      .leftJoin('submission.writtenExamGrade', 'writtenExamGrade')
      .where('submission.isSubmitted = :isSubmitted', { isSubmitted: true })
      .andWhere('domain.hasWrittenExam = 1')
      .select('sum(domain.hasWrittenExam)', 'totalWithWrittenExam')
      .addSelect('sum(CASE WHEN writtenExamGrade.submissionId IS NULL THEN 1 ELSE 0 END)', 'notGraded')
      .addSelect('sum(CASE WHEN writtenExamGrade.submissionId IS NOT NULL THEN 1 ELSE 0 END)', 'initiallyGraded')
      .addSelect('sum(CASE WHEN writtenExamGrade.isDisputed = 1 THEN 1 ELSE 0 END)', 'disputed')
      .addSelect('sum(CASE WHEN writtenExamGrade.isDisputed = 1 AND writtenExamGrade.disputeGrade IS NOT NULL THEN 1 ELSE 0 END)', 'disputeGraded')
    const stats = await qb.getRawOne();
    Object.keys(stats).forEach(key => stats[key] = parseInt(stats[key], 10));
    return stats;
  }

  async submit(id: number, user?: User): Promise<Submission> {
    if(user?.type === UserType.Teacher) {
      throw new ForbiddenException();
    }
    const submission = await this.findOne(id, user);
    if(submission.isSubmitted) {
      throw new BadRequestException('Înscrierea s-a făcut deja.');
    }
    submission.isSubmitted = true;
    return this.dataSource.transaction(async manager => {
      const result = await manager.save(submission);
      await this.loggerService.log({
        name: LogName.SubmissionSubmitted,
        userId: submission.student.id,
        submissionId: submission.id,
      }, { user, manager });
      return result;
    });
  }

  async unsubmit(id: number, user?: User): Promise<Submission> {
    const submission = await this.findOne(id, user);
    if(!submission.isSubmitted) {
      throw new BadRequestException('Înscrierea nu s-a făcut.');
    }
    submission.isSubmitted = false;
    return this.dataSource.transaction(async manager => {
      const result = await manager.save(submission);
      await this.loggerService.log({
        name: LogName.SubmissionUnsubmitted,
        userId: submission.student.id,
        submissionId: submission.id,
      }, { user, manager });
      return result;
    });
  }

}