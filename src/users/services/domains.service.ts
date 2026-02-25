import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindManyOptions, In, Repository } from "typeorm";
import { Domain } from "../entities/domain.entity";
import { DomainDto } from "../dto/domain.dto";
import { Specialization } from "../entities/specialization.entity";
import { SpecializationDto } from "../dto/specialization.dto";
import { AdminsService } from "./admins.service";

@Injectable()
export class DomainsService {

  constructor(
    @InjectRepository(Domain) private domainsRepository: Repository<Domain>,
    @InjectRepository(Specialization) private specializationsRepository: Repository<Specialization>,
    private readonly adminsService: AdminsService,
  ) {}

  private getFindOptions(detailed: boolean): FindManyOptions<Domain> {
    return {
      relations: {
        specializations: {
          secretary: detailed,
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        paperType: true,
        hasWrittenExam: true,
        studentCount: detailed,
        offerCount: detailed,
        specializations: {
          id: true,
          catalogName: detailed,
          name: true,
          studyYears: true,
          studyForm: true,
          studentCount: detailed,
          secretary: detailed,
        }
      }
    }
  }

  async findAll(detailed = false): Promise<Domain[]> {
    return this.domainsRepository.find(this.getFindOptions(detailed));
  }

  async findAllByIds(ids: number[]): Promise<Domain[]> {
    const domains = await this.domainsRepository.findBy({ id: In(ids) });
    if(domains.length !== ids.length) {
      throw new NotFoundException('Unul sau mai multe domenii nu au fost găsite.');
    }
    return domains;
  }

  async findOne(id: number): Promise<Domain> {
    const domain = await this.domainsRepository.findOne({ 
      where: { id }, 
      ...this.getFindOptions(true)
    });
    if(!domain) {
      throw new NotFoundException();
    }
    return domain;
  }

  private async mapSpecializations(specializations: SpecializationDto[]): Promise<Specialization[]> {
    return Promise.all(
      specializations.map(async (dto) => {
        const specialization = this.specializationsRepository.create(dto);
        if(dto.secretaryId) {
          specialization.secretary = await this.adminsService.findOneSecretary(dto.secretaryId);
        } else {
          specialization.secretary = null;
        }
        return specialization;
      })
    );
  }

  async create(dto: DomainDto): Promise<Domain> {
    const domain = this.domainsRepository.create(dto);
    domain.specializations = await this.mapSpecializations(dto.specializations);
    await this.domainsRepository.save(domain);
    return this.findOne(domain.id);
  }

  async update(id: number, dto: DomainDto): Promise<Domain> {
    const domain = await this.findOne(id);
    const updatedDomain = this.domainsRepository.merge(domain, dto);
    updatedDomain.specializations = await this.mapSpecializations(dto.specializations);
    await this.domainsRepository.save(updatedDomain);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    const domain = await this.findOne(id);
    if(domain.studentCount > 0) {
      throw new BadRequestException('Acest domeniu nu poate fi șters, deoarece are studenți.');
    }
    await this.domainsRepository.remove(domain);
  }

}