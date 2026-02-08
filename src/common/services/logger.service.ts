import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { Log } from "../entities/log.entity";
import { JwtPayload } from "../../lib/interfaces/jwt-payload.interface";
import { User } from "../../users/entities/user.entity";
import { LogSeverity } from "../../lib/enums/log-severity.enum";

@Injectable()
export class LoggerService {

  constructor(private readonly dataSource: DataSource) {}

  log(logInput: LogInput, options: LogOptions = {}): Promise<Log> {
    const manager = options.manager || this.dataSource.manager;
    const log = manager.create(Log, {
      ...logInput,
      byUserId: options.user?.id || null,
      impersonatedByUserId: options.user?._impersonatedBy || null,
      severity: logInput.severity || LogSeverity.Info,
    });
    return manager.save(log);
  }
}

type LogInput = Partial<Omit<Log, 'id' | 'timestamp' | 'byUserId' | 'impersonatedByUserId'>> & {
  name: Log['name'];
};
type LogOptions = {
  manager?: EntityManager;
  user?: JwtPayload | User;
};