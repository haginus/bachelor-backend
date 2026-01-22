import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindManyOptions, Repository } from "typeorm";
import { Domain } from "../entities/domain.entity";
import { DomainDto } from "../dto/domain.dto";

@Injectable()
export class DomainsService {

  constructor(
    @InjectRepository(Domain) private domainsRepository: Repository<Domain>,
  ) {}

  private getFindOptions(detailed: boolean): FindManyOptions<Domain> {
    return {
      relations: { specializations: true },
      select: {
        id: true,
        name: true,
        type: true,
        paperType: true,
        studentCount: detailed,
        specializations: {
          id: true,
          name: true,
          studyYears: true,
          studyForm: true,
          studentCount: detailed,
        }
      }
    }
  }

  async findAll(detailed = false): Promise<Domain[]> {
    return this.domainsRepository.find(this.getFindOptions(detailed));
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

  async create(dto: DomainDto): Promise<Domain> {
    const domain = this.domainsRepository.create(dto);
    await this.domainsRepository.save(domain);
    return this.findOne(domain.id);
  }

  async update(id: number, dto: DomainDto): Promise<Domain> {
    const domain = await this.findOne(id);
    const updatedDomain = this.domainsRepository.merge(domain, dto);
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