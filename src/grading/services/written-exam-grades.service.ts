import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WrittenExamGrade } from "../entities/written-exam-grade.entity";
import { DataSource, FindOptionsRelations, Repository } from "typeorm";
import { GradeWrittenExamDto } from "../dto/grade-written-exam.dto";
import { SubmissionsService } from "./submissions.service";
import { WrittenExamGradeImportDto } from "../dto/written-exam-grade-import.dto";
import { ImportResponse } from "../../lib/interfaces/import-response.interface";
import { User } from "../../users/entities/user.entity";
import { CsvParserService } from "../../csv/csv-parser.service";
import { LoggerService } from "../../common/services/logger.service";
import { LogName } from "../../lib/enums/log-name.enum";
import { SessionSettingsService } from "../../common/services/session-settings.service";
import { UserType } from "../../lib/enums/user-type.enum";
import { ImportJobsService } from "../../common/services/import-jobs.service";

@Injectable()
export class WrittenExamGradesService {
  
  constructor(
    @InjectRepository(WrittenExamGrade) private readonly writtenExamGradesRepository: Repository<WrittenExamGrade>,
    private readonly dataSource: DataSource,
    private readonly sessionSettingsService: SessionSettingsService,
    private readonly submissionsService: SubmissionsService,
    private readonly csvParserService: CsvParserService,
    private readonly importJobsService: ImportJobsService,
    private readonly loggerService: LoggerService,
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

  private async checkGradingAllowed() {
    const settings = await this.sessionSettingsService.getSettings();
    if(!settings.writtenExamDate || settings.writtenExamDate.getTime() > Date.now()) {
      throw new BadRequestException('Nu puteți nota proba scrisă momentan.');
    }
  }

  async gradeSubmission(submissionId: number, dto: GradeWrittenExamDto, user?: User): Promise<WrittenExamGrade> {
    const submission = await this.submissionsService.findOne(submissionId);
    await this.checkGradingAllowed();
    if(!submission.isSubmitted) {
      throw new BadRequestException('Acest student nu este înscris.');
    }
    if(!submission.student.specialization.domain.hasWrittenExam) {
      throw new BadRequestException('Această înscriere nu suportă proba scrisă.');
    }
    const grade = await this.writtenExamGradesRepository.findOneOrFail({ where: { submissionId } }).catch(() => {
      return this.writtenExamGradesRepository.create({ submission, submissionId });
    });
    this.writtenExamGradesRepository.merge(grade, dto, { submission });
    if(grade.initialGrade == undefined) {
      throw new BadRequestException('Specificați o notă inițială.');
    }
    if(!grade.isDisputed && grade.disputeGrade) {
      throw new BadRequestException('Nu puteți specifica nota după contestație fără o contestație depusă.');
    }
    if(grade.initialGrade === 0 && grade.disputeGrade) {
      throw new BadRequestException('Nu puteți specifica nota după contestație pentru un student absent.');
    }
    return this.dataSource.transaction(async manager => {
      const savedGrade = await manager.save(grade);
      await this.loggerService.log({
        name: LogName.WrittenExamGradeGiven,
        userId: submission.student.id,
        submissionId,
        meta: {
          payload: {
            initialGrade: grade.initialGrade,
            isDisputed: grade.isDisputed,
            disputeGrade: grade.disputeGrade,
          }
        }
      }, { user, manager });
      return savedGrade;
    });
  }

  async import(file: Buffer, requestUser?: User): Promise<ImportResponse<WrittenExamGradeImportDto, WrittenExamGrade>> {
    await this.checkGradingAllowed();
    const dtos = await this.csvParserService.parse(file, WrittenExamGradeImportDto);
    const importJob = this.importJobsService.createJob<WrittenExamGradeImportDto, WrittenExamGrade>(dtos, async (dto) => {
      return { result: 'updated', data: await this.gradeSubmission(dto.submissionId, dto, requestUser) };
    });
    return importJob.getStatus();
  }

  async getImportSpecification() {
    return this.csvParserService.getImportSpecification(WrittenExamGradeImportDto);
  }

  async disputeGrade(submissionId: number, user: User): Promise<WrittenExamGrade> {
    const sessionSettings = await this.sessionSettingsService.getSettings();
    if(!sessionSettings.writtenExamDate || (!sessionSettings.writtenExamDisputeEndDate && user.type === UserType.Student)) {
      throw new BadRequestException('Nu se acceptă contestații.');
    }
    const now = Date.now();
    if(
      !sessionSettings.writtenExamGradesPublic || 
      now < sessionSettings.writtenExamDate.getTime() || 
      (sessionSettings.writtenExamDisputeEndDate && now > sessionSettings.writtenExamDisputeEndDate.getTime())
    ) {
      throw new BadRequestException('Nu se acceptă contestații momentan.');
    }
    const grade = await this.findOneBySubmissionId(submissionId);
    if(user.type == UserType.Student && grade.submission.student.id !== user.id) {
      throw new ForbiddenException();
    }
    if(grade.initialGrade === 10) {
      throw new BadRequestException('Nu se poate depune contestație dacă nota inițială este maximă.');
    }
    if(grade.isDisputed) {
      throw new BadRequestException('Ați depus deja o contestație pentru această înscriere.');
    }
    if(grade.initialGrade === 0) {
      throw new BadRequestException('Nu puteți depune o contestație pentru un student absent.');
    }
    grade.isDisputed = true;
    return this.dataSource.transaction(async manager => {
      const savedGrade = await manager.save(grade);
      await this.loggerService.log({
        name: LogName.WrittenExamGradeDisputed,
        userId: grade.submission.student.id,
        submissionId,
      }, { user, manager });
      return savedGrade;
    });
  }

}