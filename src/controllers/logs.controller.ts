import { Op, WhereOptions } from "sequelize";
import { Document, DocumentReuploadRequest, Log, LogAttributes, Paper, StudentExtraData, User } from "../models/models";
import { ResponseError } from "../util/util";
import { LogName } from "../lib/types/enums/log-name.enum";
import { LogSeverity } from "../lib/types/enums/log-severity.enum";

export class LogsController {

  static async findAll(params: Record<string, string>) {
    const limit = parseInt(params.limit) || 20;
    const offset = parseInt(params.offset) || 0;
    const where = removeUndefined({
      name: computeInClause(params.name, withEnum(LogName)),
      severity: computeInClause(params.severity, withEnum(LogSeverity)),
      byUserId: computeInClause(params.byUserId, withNumbersOrNull),
      impersonatedByUserId: computeInClause(params.impersonatedByUserId, withNumbersOrNull),
      paperId: computeInClause(params.paperId, withNumbersOrNull),
    });
    const count = await Log.count({ where });
    const rows = await Log.findAll({
      where,
      include: [
        { model: User, as: 'byUser', foreignKey: 'byUserId', attributes: { exclude: ['password'] }, paranoid: false },
        { model: User, as: 'impersonatedByUser', foreignKey: 'impersonatedByUserId', attributes: { exclude: ['password'] }, paranoid: false },
        { model: User, as: 'user', foreignKey: 'userId', attributes: { exclude: ['password'] }, paranoid: false },
        { model: StudentExtraData, paranoid: false },
        { model: Paper.scope(['student', 'teacher']), paranoid: false },
        { model: Document, paranoid: false },
        { model: DocumentReuploadRequest, paranoid: false },
      ],
      order: [['timestamp', 'DESC']],
      limit,
      offset,
    });
    return { count, rows };
  }

}

interface ComputeInClauseOptions {
  allowNull?: boolean;
  allowNegative?: boolean;
  checkValue: (value: string) => boolean;
  parseValue: (value: string) => any;
}

const withNumbersOrNull: ComputeInClauseOptions = {
  allowNull: true,
  allowNegative: true,
  checkValue: value => !isNaN(parseInt(value)),
  parseValue: value => parseInt(value),
};

function withEnum(enumT: Record<string, any>): ComputeInClauseOptions {
  const enumValues = Object.fromEntries(Object.entries(enumT).map(([key, value]) => [value, key]));
  return {
    allowNull: false,
    allowNegative: true,
    checkValue: value => enumValues[value] !== undefined,
    parseValue: value => value,
  };
}

function computeInClause(values: string | undefined, { 
  allowNull = true,
  allowNegative = true,
  checkValue,
  parseValue,
}: ComputeInClauseOptions) {
  if(!values) return undefined;
  const valueList = values.split(',');
  const allowedNullValues = {
    "null": allowNull,
    "-null": allowNull && allowNegative,
  }
  function checkTokens(value: string) {
    if(allowedNullValues[value]) return true;
    if(value.startsWith('-')) {
      return allowNegative && checkValue(value.slice(1));
    }
    return checkValue(value);
  }
  if(!valueList.every(checkTokens)) {
    throw new ResponseError('Una sau mai multe valori sunt incorecte.', 'INVALID_VALUES');
  }
  const isPositiveNull = allowNull && valueList.includes('null');
  const isNegativeNull = allowNull && allowNegative && valueList.includes('-null');
  const positiveValues = valueList.filter(value => !value.startsWith('-') && value != 'null').map(parseValue);
  const negativeValues = valueList.filter(value => value.startsWith('-') && value != '-null').map(value => parseValue(value.slice(1)));
  
  const nullClauses = [];
  if(isPositiveNull) {
    nullClauses.push({ [Op.is]: null });
  }
  if(isNegativeNull) {
    nullClauses.push({ [Op.not]: null });
  }
  return {
    [Op.or]: [
      { [Op.in]: positiveValues },
      { [Op.notIn]: negativeValues },
      ...nullClauses,
    ],
  };
}

function removeUndefined(obj: WhereOptions<LogAttributes>) {
  Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
  return obj;
}

