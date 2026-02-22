import { BadRequestException, ForbiddenException, Injectable, NotFoundException, NotImplementedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Paper } from "../entities/paper.entity";
import { FindOptionsRelations, Repository, DataSource, IsNull } from "typeorm";
import { merge } from "lodash";
import { PaperQueryDto } from "../dto/paper-query.dto";
import { Paginated } from "../../lib/interfaces/paginated.interface";
import { PaperDto } from "../dto/paper.dto";
import { Student, Teacher, User } from "../../users/entities/user.entity";
import { UserType } from "../../lib/enums/user-type.enum";
import { SessionSettingsService } from "../../common/services/session-settings.service";
import { deepDiff, inclusiveDate } from "../../lib/utils";
import { TopicsService } from "../../common/services/topics.service";
import { DocumentsService } from "./documents.service";
import { ValidatePaperDto } from "../dto/validate-paper.dto";
import { DocumentGenerationService } from "../../document-generation/services/document-generation.service";
import { CreatePaperDto } from "../dto/create-paper.dto";
import { MailService } from "../../mail/mail.service";
import { RequiredDocumentsService } from "./required-documents.service";
import { Application } from "../../offers/entities/application.entity";
import { LoggerService } from "../../common/services/logger.service";
import { LogName } from "../../lib/enums/log-name.enum";
import { captureException } from "@sentry/nestjs";
import { Submission } from "../../grading/entities/submission.entity";

@Injectable()
export class PapersService {
  
  constructor(
    @InjectRepository(Paper) private readonly papersRepository: Repository<Paper>,
    private readonly sessionSettingsService: SessionSettingsService,
    private readonly topicsService: TopicsService,
    private readonly documentsService: DocumentsService,
    private readonly documentGenerationService: DocumentGenerationService,
    private readonly requiredDocumentsService: RequiredDocumentsService,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly loggerService: LoggerService,
  ) {}

  defaultRelations: FindOptionsRelations<Paper> = {
    student: {
      submission: true,
    },
    teacher: true,
    documents: true,
    documentReuploadRequests: true,
    topics: true,
    committee: true,
  };

  private mergeRelations(relations: FindOptionsRelations<Paper>): FindOptionsRelations<Paper> {
    return merge({}, this.defaultRelations, relations);
  }

  async findOne(id: number, user?: User): Promise<Paper> {
    const paper = await this.papersRepository.findOne({
      where: { id },
      relations: this.defaultRelations,
    });
    if(!paper) {
      throw new NotFoundException();
    }
    if(user && user.type !== UserType.Admin && user.type !== UserType.Secretary) {
      if(user.type === UserType.Student && paper.student.id !== user.id || user.type === UserType.Teacher && paper.teacher.id !== user.id) {
        throw new ForbiddenException();
      }
    }
    return paper;
  }

  async findOneByStudent(studentId: number): Promise<Paper> {
    const paper = await this.papersRepository.findOne({
      where: { student: { id: studentId } },
      relations: this.mergeRelations({ 
        committee: { 
          members: { teacher: true }, 
          activityDays: true 
        },
        grades: {
          committeeMember: {
            teacher: { profile: false }
          }
        }
      }),
    });
    if(!paper) {
      throw new NotFoundException();
    }
    return paper;
  }

  async findAllByTeacher(teacherId: number): Promise<Paper[]> {
    return this.papersRepository.find({
      where: { teacher: { id: teacherId } },
      relations: this.mergeRelations({ 
        teacher: false, 
        student: { specialization: true },
        documentReuploadRequests: false,
      }),
    });
  }

  async findAll(query: PaperQueryDto): Promise<Paginated<Paper>> {
    const qb = this.papersRepository.createQueryBuilder('paper')
      .leftJoinAndSelect('paper.student', 'student')
      .leftJoinAndSelect('paper.teacher', 'teacher')
      .leftJoinAndSelect('paper.topics', 'topics')
      .leftJoinAndSelect('paper.committee', 'committee')
      .leftJoinAndSelect('student.submission', 'submission');
    
    if(query.minified !== true) {
      qb.leftJoinAndSelect('paper.documents', 'documents')
        .leftJoinAndSelect('paper.documentReuploadRequests', 'documentReuploadRequests')
        .leftJoinAndSelect('paper.grades', 'grades')
        .leftJoinAndSelect('grades.committeeMember', 'committeeMember')
        .leftJoinAndSelect('committeeMember.teacher', 'committeeMemberTeacher');
    }
    
    if(query.validity) {
      if(query.validity === 'not_invalid') {
        qb.andWhere('(paper.isValid IS NULL OR paper.isValid = TRUE)');
      } else if(query.validity === 'not_validated') {
        qb.andWhere('paper.isValid IS NULL');
      } else {
        qb.andWhere('paper.isValid = :isValid', { isValid: query.validity === 'valid' });
      }
    }
    if(query.title) {
      qb.andWhere('paper.title LIKE :title', { title: `%${query.title}%` });
    }
    if(query.type) {
      qb.andWhere('paper.type = :type', { type: query.type });
    }
    if(query.submitted !== undefined) {
      qb.andWhere(`submission.isSubmitted = :isSubmitted`, { isSubmitted: query.submitted });
    }
    if(query.assigned !== undefined && !query.assignedTo) {
      qb.andWhere(`paper.committeeId IS ${query.assigned ? 'NOT' : ''} NULL`);
    }
    if(query.assignedTo) {
      qb.andWhere('paper.committeeId = :committeeId', { committeeId: query.assignedTo });
    }
    if(query.specializationId || query.domainId || query.forCommittee) {
      qb.leftJoin('student.specialization', 'specialization');
    }
    if(query.domainId || query.forCommittee) {
      qb.leftJoin('specialization.domain', 'domain');
    }
    if(query.forCommittee) {
      const domainIds = await this.dataSource.createQueryBuilder()
        .select('cd.domainId', 'domainId')
        .from('committee_domains', 'cd')
        .where('cd.committeeId = :committeeId', { committeeId: query.forCommittee })
        .getRawMany<{ domainId: number }>();
      
      qb.andWhere('domain.id IN (:...domainIds)', { domainIds: domainIds.map(d => d.domainId) });
    }
    if(query.domainId && !query.specializationId && !query.forCommittee) {
      qb.andWhere('domain.id = :domainId', { domainId: query.domainId });
    }
    if(query.specializationId) {
      qb.andWhere('specialization.id = :specializationId', { specializationId: query.specializationId });
    }
    if(query.studentName) {
      qb.andWhere(
        `(CONCAT(student.firstName, ' ', student.lastName) LIKE :search OR CONCAT(student.lastName, ' ', student.firstName) LIKE :search)`,
        { search: `%${query.studentName}%` },
      );
    }
    const count = await qb.getCount();
    if(query.sortBy) {
      if(query.sortBy === 'committee') {
        qb.orderBy('committee.name', query.sortDirection.toUpperCase() as 'ASC' | 'DESC');
      } else {
        qb.orderBy(`paper.${query.sortBy}`, query.sortDirection.toUpperCase() as 'ASC' | 'DESC');
      }
    }
    const rows = await qb.skip(query.offset).take(query.limit).getMany();
    return { rows, count };
  }

  async create(dto: CreatePaperDto, user?: User) {
    if(user?.type === UserType.Teacher) {
      if(dto.teacherId !== user.id) {
        throw new ForbiddenException();
      }
      const sessionSettings = await this.sessionSettingsService.getSettings();
      if(!sessionSettings.canApply()) {
        throw new BadRequestException('Nu se pot crea lucrări în afara perioadei de asociere.');
      }
    }
    const student = await this.dataSource.getRepository(Student).findOne({
      where: { id: dto.studentId },
      relations: { 
        paper: true,
        extraData: true,
        specialization: { domain: true },
      },
    });
    if(!student) {
      throw new BadRequestException('Studentul specificat nu există.');
    }
    if(student.paper) {
      throw new BadRequestException('Studentul specificat are deja o lucrare asociată.');
    }
    const teacher = await this.dataSource.getRepository(Teacher).findOneByOrFail({ id: dto.teacherId }).catch(() => {
      throw new BadRequestException('Profesorul specificat nu există.');
    });
    const topics = await this.topicsService.findByIds(dto.topicIds);
    const paper = this.dataSource.getRepository(Paper).create({
      ...dto,
      type: student.specialization.domain.paperType,
      topics,
      student,
      teacher,
      requiredDocuments: [],
    });
    paper.requiredDocuments = await this.requiredDocumentsService.getRequiredDocumentsForPaper(paper);
    return this.dataSource.transaction(async manager => {
      const savedPaper = await manager.save(paper);
      // Remove all pending applications
      await manager.delete(Application, {
        student: { id: student.id },
        accepted: IsNull(),
      });
      const submission = manager.getRepository(Submission).create({
        isSubmitted: false,
        student: student,
      });
      await manager.save(submission);
      await this.loggerService.log({
        name: LogName.SubmissionCreated,
        userId: student.id,
        submissionId: submission.id,
      }, { user, manager });
      await this.loggerService.log({ 
        name: LogName.PaperCreated,
        paperId: savedPaper.id,
        meta: { 
          payload: dto,
          creationMode: 'manual',
        },
      }, { user, manager });
      await this.mailService.sendPaperCreatedEmail(savedPaper).catch((e) => {
        captureException(e);
      });
      return savedPaper;
    });
  }

  async update(paperId: number, dto: PaperDto, user?: User): Promise<{ result: Paper; documentsGenerated?: boolean; }> {
    const paper = await this.findOne(paperId, user);
    if(paper.isValid !== null) {
      throw new BadRequestException('Nu se pot face modificări asupra unei lucrări deja validate.');
    }
    if(user?.type === UserType.Student) {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const sessionSettings = await this.sessionSettingsService.getSettings();
      const now = Date.now();
      const endDateSecretary = inclusiveDate(sessionSettings.fileSubmissionEndDate);
      if(!sessionSettings.canUploadSecretaryFiles()) {
        throw new BadRequestException('Nu se pot face modificări asupra lucrării după data limită de depunere a lucrărilor.');
      }
      if(paper.createdAt.getTime() + SEVEN_DAYS_MS > now && !(now + SEVEN_DAYS_MS >= endDateSecretary.getTime())) {
        throw new BadRequestException('Nu se pot face modificări asupra lucrării în primele 7 zile de la creare.');
      }
    }
    const topics = await this.topicsService.findByIds(dto.topicIds);
    const newPaper = this.papersRepository.create({ ...paper, ...dto, topics });
    return {
      result: await this.dataSource.transaction(async manager => {
        const updatedPaper = await manager.save(newPaper);
        await this.loggerService.log({ 
          name: LogName.PaperUpdated,
          paperId: paper.id,
          meta: {
            payload: dto,
            changedFields: deepDiff(dto, { ...paper, topicIds: paper.topics.map(t => t.id) }),
          }
        }, { user, manager });
        return updatedPaper;
      }),
      documentsGenerated: (await this.documentsService.generatePaperDocuments(newPaper.id)).length > 0,
    };
  }

  async validate(dto: ValidatePaperDto, user?: User): Promise<Paper> {
    const paper = await this.findOne(dto.paperId);
    if(!paper.student.submission?.isSubmitted) {
      throw new BadRequestException('Lucrarea nu a fost înscrisă.');
    }
    if(paper.isValid !== null) {
      throw new BadRequestException('Lucrarea a fost deja validată.');
    }
    if(dto.isValid) {
      const generalAverage = dto.generalAverage || paper.student.generalAverage;
      if(!generalAverage || generalAverage < 5) {
        throw new BadRequestException('Media generală trebuie să fie cel puțin 5 pentru ca lucrarea să fie validată.');
      }
      if(!dto.ignoreRequiredDocuments) {
        const missingDocuments = paper.getMissingRequiredDocuments().filter(document => document.uploadBy === 'student');
        if(missingDocuments.length > 0) {
          throw new BadRequestException(`Lucrarea nu conține toate documentele necesare. Validarea poate fi făcută prin ignorarea expresă a acestui fapt. Lipsesc: ${missingDocuments.map(d => d.title).join(', ')}.`);
        }
      }
      paper.isValid = true;
      const signUpForm = paper.documents.find(document => document.name === 'sign_up_form' && document.type === 'signed');
      return this.dataSource.transaction(async manager => {
        await manager.save(paper);
        await this.loggerService.log({ name: LogName.PaperValidated, paperId: paper.id }, { user, manager });
        if(dto.generalAverage && dto.generalAverage !== paper.student.generalAverage) {
          paper.student.generalAverage = generalAverage;
          await manager.save(paper.student);
          await this.loggerService.log({ 
            name: LogName.UserUpdated,
            userId: paper.student.id,
            meta: {
              changedFields: { generalAverage },
            }
          }, { user, manager });
        }
        if(signUpForm) {
          const generationProps = await this.documentGenerationService.getStudentDocumentGenerationProps(paper.id, paper.studentId, manager);
          const documentContent = await this.documentGenerationService.generatePaperDocument('sign_up_form', generationProps);
          await this.documentsService.updateDocumentContent(signUpForm, documentContent);
        }
        return paper;
      });
    } else {
      return this.dataSource.transaction(async manager => {
        paper.isValid = false;
        paper.scheduledGrading = null;
        if(paper.committee) {
          await this.loggerService.log({ name: LogName.PaperUnassigned, paperId: paper.id, meta: { fromCommitteeId: paper.committee.id } }, { user, manager });
          paper.committee = null;
        }
        if(paper.student.submission) {
          paper.student.submission.isSubmitted = false;
          await manager.save(paper.student.submission);
          await this.loggerService.log({
            name: LogName.SubmissionUnsubmitted,
            userId: paper.student.id,
            submissionId: paper.student.submission.id,
          }, { user, manager });
        }
        await this.loggerService.log({ name: LogName.PaperInvalidated, paperId: paper.id }, { user, manager });
        return manager.save(paper);
      });
    }
  }

  async undoValidation(paperId: number, user?: User): Promise<Paper> {
    const paper = await this.findOne(paperId);
    if(paper.isValid === null) {
      throw new BadRequestException('Lucrarea nu a fost validată.');
    }
    paper.isValid = null;
    return this.dataSource.transaction(async manager => {
      await this.loggerService.log({ name: LogName.PaperCancelledValidation, paperId: paper.id }, { user, manager });
      return manager.save(paper);;
    });
  }

  async delete(paperId: number, user: User): Promise<void> {
    const paper = await this.findOne(paperId, user);
    if(paper.teacherId !== user.id) {
      throw new ForbiddenException();
    }
    await this.dataSource.transaction(async manager => {
      await this.loggerService.log({ name: LogName.PaperDeleted, paperId: paper.id }, { user, manager });
      await manager.delete(Submission, { student: { id: paper.studentId } });
      if(paper.committee) {
        await this.loggerService.log({ name: LogName.PaperUnassigned, paperId: paper.id, meta: { fromCommitteeId: paper.committee.id } }, { user, manager });
        paper.committee = null;
        paper.scheduledGrading = null;
      }
      await manager.save(paper);
      await manager.softRemove(paper);
      // Update application (if any) to declined so the student cannot re-apply
      await manager.update(Application, {
        student: { id: paper.studentId },
        accepted: true,
      }, {
        accepted: false,
      });
    });
    await this.mailService.sendPaperRemovedEmail(paper.student, paper.teacher).catch((e) => {
      captureException(e);
    });
  }
}