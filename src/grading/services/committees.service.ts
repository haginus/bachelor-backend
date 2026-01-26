import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsRelations, Repository } from "typeorm";
import { Committee } from "../entities/committee.entity";
import { CommitteeDto } from "../dto/committee.dto";
import { DomainsService } from "src/users/services/domains.service";
import { CommitteeMemberRole } from "src/lib/enums/committee-member-role.enum";
import { TeachersService } from "src/users/services/teachers.service";
import { CommitteeMember } from "../entities/committee-member.entity";
import { indexArray } from "src/lib/utils";

@Injectable()
export class CommitteesService {
  
  constructor(
    @InjectRepository(Committee) private readonly committeesRepository: Repository<Committee>,
    @InjectRepository(CommitteeMember) private readonly committeeMembersRepository: Repository<CommitteeMember>,
    private readonly domainsService: DomainsService,
    private readonly teachersService: TeachersService,
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

  async findOne(id: number): Promise<Committee> {
    const committee = await this.committeesRepository.findOne({
      where: { id },
      relations: this.defaultRelations,
    });
    if(!committee) {
      throw new NotFoundException();
    }
    return committee;
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
    const committee = await this.findOne(id);
    const relations = await this.getDtoRelations(dto);
    Object.assign(committee, dto, relations);
    return this.committeesRepository.save(committee);
  }

  async markGradesFinal(id: number, finalGrades = true): Promise<Committee> {
    const committee = await this.findOne(id);
    committee.finalGrades = finalGrades;
    return this.committeesRepository.save(committee);
  }

  async delete(id: number): Promise<void> {
    const committee = await this.findOne(id);
    await this.committeesRepository.remove(committee);
  }
}