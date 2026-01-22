import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Domain } from "../entities/domain.entity";

@Injectable()
export class DomainsService {

  constructor(
    @InjectRepository(Domain) private domainsRepository: Repository<Domain>,
  ) {}

  findAll(detailed = false): Promise<Domain[]> {
    return this.domainsRepository.find({ relations: { specializations: true } });
  }
}