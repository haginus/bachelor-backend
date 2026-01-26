import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Paper } from "../entities/paper.entity";
import { FindOptionsRelations, Repository } from "typeorm";
import { merge } from "lodash";
import { PaperQueryDto } from "../dto/paper-query.dto";
import { Paginated } from "src/lib/interfaces/paginated.interface";
import { PaperDto } from "../dto/paper.dto";
import { User } from "src/users/entities/user.entity";
import { UserType } from "src/lib/enums/user-type.enum";
import { SessionSettingsService } from "src/common/services/session-settings.service";
import { inclusiveDate } from "src/lib/utils";
import { TopicsService } from "src/common/services/topics.service";

@Injectable()
export class PapersService {
  
  constructor(
    @InjectRepository(Paper) private readonly papersRepository: Repository<Paper>,
    private readonly sessionSettingsService: SessionSettingsService,
    private readonly topicsService: TopicsService,
  ) {}

  defaultRelations: FindOptionsRelations<Paper> = {
    student: true,
    teacher: true,
    documents: true,
    topics: true,
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
      relations: this.defaultRelations,
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
      .leftJoinAndSelect('paper.documents', 'documents')
      .leftJoinAndSelect('paper.topics', 'topics');
    
    if(query.validity) {
      if(query.validity === 'not_validated') {
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
    if(query.domainId && !query.specializationId) {
      qb
        .leftJoin('student.specialization', 'specialization')
        .leftJoin('specialization.domain', 'domain')
        .andWhere('domain.id = :domainId', { domainId: query.domainId });
    }
    if(query.specializationId) {
      qb
        .leftJoin('student.specialization', 'specialization')
        .andWhere('specialization.id = :specializationId', { specializationId: query.specializationId });
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
        // TODO
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
      documentsGenerated: false,
    };
  }

}