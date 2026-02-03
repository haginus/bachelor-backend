import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Log } from "../entities/log.entity";
import { Repository, DataSource } from "typeorm";

@Injectable()
export class LogsService {

  constructor(
    @InjectRepository(Log) private readonly logsRepository: Repository<Log>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    const [rows, count] = await this.logsRepository.findAndCount({
      order: { id: "DESC" },
      relations: {
        byUser: true,
        impersonatedByUser: true,
        user: true,
        userExtraData: true,
        paper: { student: true, teacher: true },
        document: true,
        documentReuploadRequest: true,
      },
      withDeleted: true,
    });
    return { rows, count };
  }

}