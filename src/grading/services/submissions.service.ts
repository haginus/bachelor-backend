import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Submission } from "../entities/submission.entity";
import { Repository } from "typeorm";
import { SubmissionQueryDto } from "../dto/submission-query.dto";
import { Paginated } from "../../lib/interfaces/paginated.interface";

@Injectable()
export class SubmissionsService {
 
  constructor(
    @InjectRepository(Submission) private readonly submissionsRepository: Repository<Submission>
  ) {}

  private getQueryBuilder() {
    return this.submissionsRepository.createQueryBuilder('submission')
      .leftJoinAndSelect('submission.student', 'student')
      .leftJoinAndSelect('student.specialization', 'specialization')
      .leftJoinAndSelect('specialization.domain', 'domain')
      .leftJoinAndSelect('student.paper', 'paper')
      .leftJoinAndSelect('submission.writtenExamGrade', 'writtenExamGrade')
      .where('submission.isSubmitted = :isSubmitted', { isSubmitted: true });
  }

  async findAll(query: SubmissionQueryDto): Promise<Paginated<Submission>> {
    const qb = this.getQueryBuilder();
    if(query.hasWrittenExam) {
      qb.andWhere('domain.hasWrittenExam = :hasWrittenExam', { hasWrittenExam: true });
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

  async findOne(id: number): Promise<Submission> {
    const qb = this.getQueryBuilder();
    qb.andWhere('submission.id = :id', { id });
    const submission = await qb.getOne();
    if(!submission) {
      throw new NotFoundException();
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

}