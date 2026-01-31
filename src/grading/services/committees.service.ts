import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsRelations, In, Repository, DataSource } from "typeorm";
import { Committee } from "../entities/committee.entity";
import { CommitteeDto } from "../dto/committee.dto";
import { DomainsService } from "src/users/services/domains.service";
import { CommitteeMemberRole } from "src/lib/enums/committee-member-role.enum";
import { TeachersService } from "src/users/services/teachers.service";
import { CommitteeMember } from "../entities/committee-member.entity";
import { inclusiveDate, indexArray } from "src/lib/utils";
import { Paper } from "src/papers/entities/paper.entity";
import { PaperGrade } from "../entities/paper-grade.entity";
import { User } from "src/users/entities/user.entity";
import { UserType } from "src/lib/enums/user-type.enum";
import { GradePaperDto } from "../dto/grade-paper.dto";
import { DocumentGenerationService } from "src/document-generation/services/document-generation.service";
import { SchedulePapersDto } from "../dto/schedule-papers.dto";

@Injectable()
export class CommitteesService {
  
  constructor(
    @InjectRepository(Committee) private readonly committeesRepository: Repository<Committee>,
    @InjectRepository(CommitteeMember) private readonly committeeMembersRepository: Repository<CommitteeMember>,
    private readonly domainsService: DomainsService,
    private readonly teachersService: TeachersService,
    private readonly dataSource: DataSource,
    private readonly documentGenerationService: DocumentGenerationService,
  ) {}

  private readonly defaultRelations: FindOptionsRelations<Committee> = {
    domains: true,
    members: {
      teacher: true,
    },
    activityDays: true,
    papers: true,
  };

  async findAll(): Promise<Committee[]> {
    return this.committeesRepository.find({
      relations: this.defaultRelations,
    });
  }

  async findByTeacher(teacherId: number): Promise<Committee[]> {
    return this.committeesRepository.find({
      relations: this.defaultRelations,
      where: {
        members: {
          teacher: { id: teacherId },
        },
      },
    });
  }

  async findOne(id: number, user?: User): Promise<Committee> {
    const committee = await this.committeesRepository.findOne({
      where: { id },
      relations: {
        ...this.defaultRelations,
        domains: {
          specializations: true,
        },
        papers: {
          student: true,
          teacher: true,
          submission: true,
          documents: true,
          grades: {
            committeeMember: {
              teacher: true
            },
          }
        }
      },
    });
    if(!committee) {
      throw new NotFoundException();
    }
    if(user && user.type !== UserType.Admin && user.type !== UserType.Secretary) {
      this.checkCommitteeMembership(committee, user);
    }
    return committee;
  }

  private async _findOneMin(id: number, user?: User): Promise<Committee> {
    const committee = await this.committeesRepository.findOne({
      where: { id },
      relations: {
        ...this.defaultRelations,
        domains: {
          specializations: true,
        },
      },
    });
    if(!committee) {
      throw new NotFoundException();
    }
    if(user && user.type !== UserType.Admin && user.type !== UserType.Secretary) {
      this.checkCommitteeMembership(committee, user);
    }
    return committee;
  }

  private checkCommitteeMembership(committee: Committee, user: User, additionalRights?: MembershipRights[]): CommitteeMember {
    const rightChecks: Record<MembershipRights, (member: CommitteeMember) => boolean> = {
      canGrade: (member) => member.role !== CommitteeMemberRole.Secretary,
      canSchedule: (member) => member.role === CommitteeMemberRole.President || member.role === CommitteeMemberRole.Secretary,
      canMarkGradesFinal: (member) => member.role === CommitteeMemberRole.President || member.role === CommitteeMemberRole.Secretary,
      canGenerateFiles: (member) => member.role === CommitteeMemberRole.President || member.role === CommitteeMemberRole.Secretary,
    };
    const member = committee.members.find(m => m.teacher.id === user.id);
    if(!member) {
      throw new ForbiddenException();
    }
    additionalRights?.forEach(right => {
      const check = rightChecks[right];
      if(!check(member)) {
        throw new ForbiddenException();
      }
    });
    return member;
  }

  private async getDtoRelations(dto: CommitteeDto) {
    let presidentCount = 0, secretaryCount = 0, memberCount = 0;
    dto.members.forEach(member => {
      switch(member.role) {
        case CommitteeMemberRole.President:
          presidentCount++;
          break;
        case CommitteeMemberRole.Secretary:
          secretaryCount++;
          break;
        case CommitteeMemberRole.Member:
          memberCount++;
          break;
      }
    });
    if(presidentCount !== 1 || secretaryCount !== 1 || memberCount < 2) {
      throw new BadRequestException('O comisie trebuie să aibă exact un președinte și un secretar și cel puțin doi membri.');
    }
    const domains = await this.domainsService.findAllByIds(dto.domainIds);
    if(!domains.every(domain => domain.type === domains[0].type)) {
      throw new BadRequestException('Domeniile unei comisii trebuie să fie de același tip.');
    }
    const teachers = await this.teachersService.findAllByIds(dto.members.map(m => m.teacherId));
    const teacherIndex = indexArray(teachers, t => t.id);
    const members = dto.members.map(memberDto => {
      const teacher = teacherIndex[memberDto.teacherId];
      const member = this.committeeMembersRepository.create({
        role: memberDto.role,
        teacher,
      });
      return member;
    });
    return { 
      members,
      domains,
    };
  }

  async create(dto: CommitteeDto): Promise<Committee> {
    const relations = await this.getDtoRelations(dto);
    const committee = this.committeesRepository.create({
      ...dto,
      ...relations,
    });
    return this.committeesRepository.save(committee);
  }

  async update(id: number, dto: CommitteeDto): Promise<Committee> {
    const committee = await this._findOneMin(id);
    const relations = await this.getDtoRelations(dto);
    Object.assign(committee, dto, relations);
    return this.committeesRepository.save(committee);
  }

  async markGradesFinal(id: number, finalGrades = true, user?: User): Promise<Committee> {
    const committee = await this._findOneMin(id);
    if(user) {
      this.checkCommitteeMembership(committee, user, ['canMarkGradesFinal']);
      if(user.type === UserType.Teacher && finalGrades === false) {
        throw new ForbiddenException('Profesorii nu pot demarca finalizarea notelor. Contactați administratorul sau secretariatul.');
      }
    }
    if(committee.finalGrades === finalGrades) {
      throw new BadRequestException('Starea notelor finale este deja setată la valoarea specificată.');
    }
    committee.finalGrades = finalGrades;
    return this.committeesRepository.save(committee);
  }

  async setPapers(id: number, paperIds: number[]): Promise<Committee> {
    const committee = await this._findOneMin(id);
    const domainSet = new Set(committee.domains.map(d => d.id));
    const papersSet = new Set(paperIds);
    const papers = await this.dataSource.getRepository(Paper).find({
      where: { id: In(paperIds) },
      relations: {
        submission: true,
        committee: true,
        student: { specialization: { domain: true } },
      }
    });
    if(papers.length !== paperIds.length) {
      throw new NotFoundException('Unele lucrări specificate nu există.');
    }
    if(papers.some(paper => !paper.submission)) {
      throw new BadRequestException('Una sau mai multe lucrări nu sunt înscrise.');
    }
    if(papers.some(paper => !domainSet.has(paper.student.specialization.domain.id))) {
      throw new BadRequestException('Toate lucrările trebuie să aparțină domeniilor comisiei.');
    }
    if(papers.some(paper => paper.isValid === false)) {
      throw new BadRequestException('Nu se pot adăuga lucrări invalide în comisie.');
    }
    const newPapers = papers.filter(paper => !paper.committee);
    const movedPapers = papers.filter(paper => paper.committee && paper.committee.id !== committee.id);
    const removedPapers = committee.papers.filter(paper => !papersSet.has(paper.id));
    const committeePapers = [...newPapers, ...movedPapers];
    await this.dataSource.transaction(async manager => {
      await manager.delete(PaperGrade, { paperId: In([...movedPapers, ...removedPapers].map(p => p.id)) });
      await manager.update(Paper, { id: In(committeePapers.map(p => p.id)) }, { committee, scheduledGrading: null, updatedAt: new Date() });
      await manager.update(Paper, { id: In(removedPapers.map(p => p.id)) }, { committee: null, scheduledGrading: null, updatedAt: new Date() });
    });
    return this._findOneMin(id);
  }

  async schedulePapers(dto: SchedulePapersDto, user: User): Promise<Committee> {
    const committee = await this._findOneMin(dto.committeeId);
    this.checkCommitteeMembership(committee, user, ['canSchedule']);
    const paperIndex = indexArray(committee.papers, p => p.id);
    const updates: Partial<Paper>[] = [];
    dto.papers?.forEach(paperDto => {
      const paper = paperIndex[paperDto.paperId];
      if(!paper) {
        throw new BadRequestException(`Lucrarea cu ID-ul ${paperDto.paperId} nu aparține comisiei.`);
      }
      if(
        paperDto.scheduledGrading && 
        !committee.activityDays.find(day => (
          day.startTime.getTime() <= paperDto.scheduledGrading!.getTime() && 
          paperDto.scheduledGrading!.getTime() < inclusiveDate(day.startTime).getTime()
        ))
      ) {
        throw new BadRequestException(`Data și ora programate pentru lucrarea cu ID-ul ${paperDto.paperId} nu se încadrează în zilele de activitate ale comisiei.`);
      }
      updates.push({
        id: paper.id,
        scheduledGrading: paperDto.scheduledGrading ?? null,
      });
    });
    await this.dataSource.manager.transaction(async manager => {
      committee.publicScheduling = dto.publicScheduling ?? committee.publicScheduling;
      committee.paperPresentationTime = dto.paperPresentationTime ?? committee.paperPresentationTime;
      await manager.save(committee);
      for(const update of updates) {
        await manager.update(Paper, { id: update.id }, { scheduledGrading: update.scheduledGrading });
      }
    });
    return this._findOneMin(dto.committeeId);
  }

  async gradePaper(dto: GradePaperDto, user: User): Promise<PaperGrade> {
    const committee = await this._findOneMin(dto.committeeId);
    const committeeMember = this.checkCommitteeMembership(committee, user, ['canGrade']);
    const paper = committee.papers.find(p => p.id === dto.paperId);
    if(!paper) {
      throw new BadRequestException('Lucrarea specificată nu aparține comisiei.');
    }
    if(committee.finalGrades) {
      throw new BadRequestException('Notarea lucrărilor este finalizată pentru această comisie.');
    }
    const grade = this.dataSource.manager.getRepository(PaperGrade).create({
      forPaper: dto.forPaper,
      forPresentation: dto.forPresentation,
      paper,
      committeeMember,
    });
    await this.dataSource.manager.save(grade);
    // @ts-ignore
    delete grade.paper;
    return grade;
  }

  async generateCommitteeFile(committeeId: number, fileName: string, user?: User): Promise<Buffer> {
    const committee = await this._findOneMin(committeeId);
    if(user && user.type !== UserType.Admin && user.type !== UserType.Secretary) {
      this.checkCommitteeMembership(committee, user, ['canGenerateFiles']);
    }
    switch(fileName) {
      case 'catalog_pdf':
        return this.documentGenerationService.generateCommitteeCatalogPdf(committeeId);
      case 'catalog_docx':
        return this.documentGenerationService.generateCommitteeCatalogWord(committeeId);
      case 'final_catalog_pdf':
        return this.documentGenerationService.generateCommitteeFinalCatalogPdf(committeeId);
      default:
        throw new BadRequestException('Numele fișierului specificat nu este valid.');
    }
  }

  async delete(id: number): Promise<void> {
    const committee = await this._findOneMin(id);
    await this.committeesRepository.remove(committee);
  }
}

type MembershipRights = 'canGrade' | 'canSchedule' | 'canMarkGradesFinal' | 'canGenerateFiles';
