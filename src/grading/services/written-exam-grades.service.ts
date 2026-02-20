import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WrittenExamGrade } from "../entities/written-exam-grade.entity";
import { FindOptionsRelations, Repository } from "typeorm";
import { GradeWrittenExamDto } from "../dto/grade-written-exam.dto";
import { SubmissionsService } from "./submissions.service";
import { WrittenExamGradeImportDto } from "../dto/written-exam-grade-import.dto";
import { ImportResult } from "../../lib/interfaces/import-result.interface";
import { User } from "../../users/entities/user.entity";
import { CsvParserService } from "../../csv/csv-parser.service";

@Injectable()
export class WrittenExamGradesService {
  
  constructor(
    @InjectRepository(WrittenExamGrade) private readonly writtenExamGradesRepository: Repository<WrittenExamGrade>,
    private readonly submissionsService: SubmissionsService,
    private readonly csvParserService: CsvParserService,
  ) {}

  private readonly defaultRelations: FindOptionsRelations<WrittenExamGrade> = {
    submission: {
      student: true,
    }
  };

  async findOneBySubmissionId(submissionId: number): Promise<WrittenExamGrade> {
    const grade = await this.writtenExamGradesRepository.findOne({ 
      where: { submissionId },
      relations: this.defaultRelations
    });
    if(!grade) {
      throw new NotFoundException();
    }
    return grade;
  }

  async findOneByStudentId(studentId: number): Promise<WrittenExamGrade> {
    const grade = await this.writtenExamGradesRepository.findOne({ 
      where: { submission: { student: { id: studentId } } },
      relations: this.defaultRelations
    });
    if(!grade) {
      throw new NotFoundException();
    }
    return grade;
  }

  async gradeSubmission(submissionId: number, dto: GradeWrittenExamDto, requestUser?: User): Promise<WrittenExamGrade> {
    const submission = await this.submissionsService.findOne(submissionId);
    if(!submission.student.specialization.domain.hasWrittenExam) {
      throw new BadRequestException('Această înscriere nu suportă proba scrisă.');
    }
    const grade = await this.writtenExamGradesRepository.findOneOrFail({ where: { submissionId } }).catch(() => {
      return this.writtenExamGradesRepository.create({ submission, submissionId });
    });
    this.writtenExamGradesRepository.merge(grade, dto);
    if(grade.initialGrade == undefined) {
      throw new BadRequestException('Specificați o notă inițială.');
    }
    if(!grade.isDisputed && grade.disputeGrade) {
      throw new BadRequestException('Nu puteți specifica nota după contestație fără o contestație depusă.');
    }
    if(grade.initialGrade === 0 && grade.disputeGrade) {
      throw new BadRequestException('Nu puteți specifica nota după contestație pentru un student absent.');
    }
    return this.writtenExamGradesRepository.save(grade);
  }

  async import(file: Buffer, requestUser?: User): Promise<ImportResult<WrittenExamGradeImportDto, WrittenExamGrade>> {
    const dtos = await this.csvParserService.parse(file, {
      headers: [
        ['ID_INSCRIERE', 'submissionId'],
        ['NUME_STUDENT', 'studentName'],
        ['DOMENIU', 'domain'],
        ['NOTA_INITIALA', 'initialGrade'],
        ['NOTA_CONTESTATIE', 'disputeGrade'],
      ],
      dto: WrittenExamGradeImportDto,
    });
    const promises = dtos.map(dto => this.gradeSubmission(dto.submissionId, dto, requestUser));
    const results = await Promise.allSettled(promises);
    const bulkResult: ImportResult<WrittenExamGradeImportDto, WrittenExamGrade> = {
      summary: {
        proccessed: results.length,
        updated: 0,
        failed: 0,
      },
      rows: [],
    };
    results.forEach((result, index) => {
      if(result.status === 'fulfilled') {
        bulkResult.summary.updated!++;
        bulkResult.rows.push({
          rowIndex: index + 1,
          result: 'updated',
          row: dtos[index],
          data: result.value,
        });
      } else {
        bulkResult.summary.failed++;
        bulkResult.rows.push({
          rowIndex: index + 1,
          result: 'failed',
          row: dtos[index],
          data: null,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });
    return bulkResult;
  }
}