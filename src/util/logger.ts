import { Transaction } from "sequelize";
import { Log, LogCreationAttributes, User } from "../models/models";
import { LogSeverity } from "../lib/types/enums/log-severity.enum";

export class Logger {
  static async log(byUser: User, log: LogInput, options: LogOptions = {}) {
    return Log.create({
      ...log,
      byUserId: byUser?.id || null,
      severity: log.severity || LogSeverity.Info,
    }, options);
  }
}

type LogInput = Omit<LogCreationAttributes, 'id' | 'byUserId' | 'severity'> & Pick<Partial<LogCreationAttributes>, 'severity'>;

interface LogOptions {
  transaction?: Transaction;
}