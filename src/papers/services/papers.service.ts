import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Paper } from "../entities/paper.entity";
import { FindOptionsRelations, Repository, DataSource } from "typeorm";
import { merge } from "lodash";
import { PaperQueryDto } from "../dto/paper-query.dto";
import { Paginated } from "src/lib/interfaces/paginated.interface";
import { PaperDto } from "../dto/paper.dto";
import { User } from "src/users/entities/user.entity";
import { UserType } from "src/lib/enums/user-type.enum";
import { SessionSettingsService } from "src/common/services/session-settings.service";
import { inclusiveDate } from "src/lib/utils";
import { TopicsService } from "src/common/services/topics.service";
import { DocumentsService } from "./documents.service";
import { Submission } from "../entities/submission.entity";
import { ValidatePaperDto } from "../dto/validate-paper.dto";
import { DocumentGenerationService } from "src/document-generation/services/document-generation.service";

@Injectable()
export class PapersService {
  
  constructor(
    @InjectRepository(Paper) private readonly papersRepository: Repository<Paper>,
    @InjectRepository(Submission) private readonly submissionsRepository: Repository<Submission>,
    private readonly sessionSettingsService: SessionSettingsService,
    private readonly topicsService: TopicsService,
    private readonly documentsService: DocumentsService,
    private readonly documentGenerationService: DocumentGenerationService,
    private readonly dataSource: DataSource,
  ) {}

  defaultRelations: FindOptionsRelations<Paper> = {
    student: true,
    teacher: true,
    documents: true,
    topics: true,
    committee: true,
    submission: true,
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
      relations: this.mergeRelations({ teacher: false, student: { specialization: true } }),
    });
  }

  async findAll(query: PaperQueryDto): Promise<Paginated<Paper>> {
    const qb = this.papersRepository.createQueryBuilder('paper')
      .leftJoinAndSelect('paper.student', 'student')
      .leftJoinAndSelect('paper.teacher', 'teacher')
      .leftJoinAndSelect('paper.topics', 'topics')
      .leftJoinAndSelect('paper.committee', 'committee')
      .leftJoinAndSelect('paper.submission', 'submission');
    
    if(query.minified !== true) {
      qb.leftJoinAndSelect('paper.documents', 'documents')
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
      qb.andWhere(`paper.submissionId IS ${query.submitted ? 'NOT' : ''} NULL`);
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
    this.papersRepository.merge(paper, { ...dto, topics });
    return {
      result: await this.papersRepository.save(paper),
      documentsGenerated: (await this.documentsService.generatePaperDocuments(paper.id)).length > 0,
    };
  }

  async submit(paperId: number, user?: User): Promise<Paper> {
    const paper = await this.findOne(paperId, user);
    if(paper.submission) {
      throw new BadRequestException('Înscrierea există deja.');
    }
    paper.submission = this.submissionsRepository.create({ submittedAt: new Date() });
    return this.papersRepository.save(paper);
  }

  async unsubmit(paperId: number, user?: User): Promise<Paper> {
    const paper = await this.findOne(paperId, user);
    if(!paper.submission) {
      throw new BadRequestException('Înscrierea nu există.');
    }
    paper.submission = null;
    paper.committee = null;
    return this.papersRepository.save(paper);
  }

  async validate(dto: ValidatePaperDto): Promise<Paper> {
    const paper = await this.findOne(dto.paperId);
    if(!paper.submission) {
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
        if(dto.generalAverage && dto.generalAverage !== paper.student.generalAverage) {
          paper.student.generalAverage = generalAverage;
          await manager.save(paper.student);
        }
        if(signUpForm) {
          const generationProps = await this.documentGenerationService.getStudentDocumentGenerationProps(paper.id, paper.studentId, manager);
          const documentContent = await this.documentGenerationService.generatePaperDocument('sign_up_form', generationProps);
          await this.documentsService.updateDocumentContent(signUpForm, documentContent);
        }
        return paper;
      });
    } else {
      paper.isValid = false;
      paper.committee = null;
      paper.scheduledGrading = null;
      return this.papersRepository.save(paper);
    }
  }

  async undoValidation(paperId: number): Promise<Paper> {
    const paper = await this.findOne(paperId);
    if(paper.isValid === null) {
      throw new BadRequestException('Lucrarea nu a fost validată.');
    }
    paper.isValid = null;
    return this.papersRepository.save(paper);
  }
}