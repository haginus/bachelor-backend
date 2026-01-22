import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindManyOptions, Repository } from "typeorm";
import { Specialization } from "../entities/specialization.entity";

@Injectable()
export class SpecializationsService {

  constructor(
    @InjectRepository(Specialization) private specializationsRepository: Repository<Specialization>,
  ) {}

  private getFindOptions(detailed: boolean): FindManyOptions<Specialization> {
    return {
      relations: { domain: detailed },
      select: {
        id: true,
        name: true,
        studyYears: true,
        studyForm: true,
        studentCount: detailed,
      }
    }
  }

  async findAll(detailed = false): Promise<Specialization[]> {
    return this.specializationsRepository.find(this.getFindOptions(detailed));
  }

  async findOne(id: number, detailed = false): Promise<Specialization> {
    const specialization = await this.specializationsRepository.findOne({ 
      where: { id }, 
      ...this.getFindOptions(detailed)
    });
    if(!specialization) {
      throw new NotFoundException();
    }
    return specialization;
  }

}