import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Log } from "../entities/log.entity";
import { Repository, DataSource, FindOptionsWhere, Or, IsNull, FindOperator, Not, In } from "typeorm";
import { LogQueryDto, ValueContainer } from "../dto/log-query.dto";

@Injectable()
export class LogsService {

  constructor(
    @InjectRepository(Log) private readonly logsRepository: Repository<Log>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: LogQueryDto) {
    const [rows, count] = await this.logsRepository.findAndCount({
      order: { id: "DESC" },
      relations: {
        paper: { student: true, teacher: true },
      },
      where: this.buildWhereClause(query),
      withDeleted: true,
      take: query.limit,
      skip: query.offset,
    });
    return { rows, count };
  }

  private buildWhereClause(query: LogQueryDto) {
    const where: FindOptionsWhere<Log> = {};
    (['name', 'severity', 'byUserId', 'impersonatedByUserId', 'userId', 'userExtraDataId', 'submissionId', 'paperId', 'documentId', 'documentReuploadRequestId'] as const).forEach(field => {
      if (query[field] !== undefined) {
        const valueContainers = query[field] as ValueContainer[];
        let inValues: any[] = [], notInValues: any[] = [];
        const findOperators: FindOperator<any>[] = [];
        valueContainers.forEach(vc => {
          if(vc.value === null && !vc.isNegative) findOperators.push(IsNull());
          else if(vc.value === null && vc.isNegative) findOperators.push(Not(IsNull()));
          else if(vc.isNegative) notInValues.push(vc.value);
          else inValues.push(vc.value);
        });
        if(inValues.length > 0) findOperators.push(In(inValues));
        if(notInValues.length > 0) findOperators.push(Not(In(notInValues)));
        if(findOperators.length === 1) {
          // @ts-ignore
          where[field] = findOperators[0];
        } else {
          // @ts-ignore
          where[field] = Or(...findOperators);
        }
      }
    });
    return where;
  }

}