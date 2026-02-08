import { applyDecorators } from "@nestjs/common";
import { Transform, Type } from "class-transformer";
import { isEnum, isInt, IsInt, isPositive, Max, Min, registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { PaginatedQueryDto } from "../../lib/dto/paginated-query.dto";
import { LogName } from "../../lib/enums/log-name.enum";
import { LogSeverity } from "../../lib/enums/log-severity.enum";

export class ValueContainer<T = any> {

  isNegative: boolean;

  constructor(public value: T, isNegative?: boolean) {
    this.isNegative = isNegative || false;
  }
}

interface ClauseOptions {
  allowNull?: boolean;
  allowNegative?: boolean;
  checkValue?: (value: any) => boolean;
  parseValue?: (value: any) => any;
}

const withNumbersOrNull: ClauseOptions = {
  allowNull: true,
  allowNegative: true,
  checkValue: value => isInt(value) && isPositive(value),
  parseValue: value => parseInt(value, 10),
};

export class LogQueryDto extends PaginatedQueryDto {

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @Max(100)
  // @ts-ignore
  override limit: number;

  @IsClause({ allowNull: false, allowNegative: true, checkValue: value => isEnum(value, LogName) })
  name?: ValueContainer<LogName>[];

  @IsClause({ allowNull: false, allowNegative: true, checkValue: value => isEnum(value, LogSeverity) })
  severity?: ValueContainer<LogSeverity>[];

  @IsClause(withNumbersOrNull)
  byUserId?: ValueContainer<number | null>[];

  @IsClause(withNumbersOrNull)
  impersonatedByUserId?: ValueContainer<number | null>[];

  @IsClause(withNumbersOrNull)
  userId?: ValueContainer<number | null>[];

  @IsClause(withNumbersOrNull)
  userExtraDataId?: ValueContainer<number | null>[];

  @IsClause(withNumbersOrNull)
  paperId?: ValueContainer<number | null>[];

  @IsClause(withNumbersOrNull)
  documentId?: ValueContainer<number | null>[];

  @IsClause(withNumbersOrNull)
  documentReuploadRequestId?: ValueContainer<number | null>[];
}

function transformClause(
  value: any, 
  { parseValue = (value: any) => value }: ClauseOptions
) {
  if(value === undefined) return undefined;
  if(typeof value !== 'string') return 'INVALID';
  const valueList = value.split(',');
  try {
    return valueList.map(v => {
      if(v === 'null') return new ValueContainer(null);
      if(v === '-null') return new ValueContainer(null, true);
      if(v.startsWith('-')) {
        return new ValueContainer(parseValue(v.slice(1)), true);
      }
      return new ValueContainer(parseValue(v));
    });
  } catch {
    return 'INVALID';
  }
}

function IsClauseValidator(options: ClauseOptions, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isClauseValidator',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [options],
      options: validationOptions,
      validator: {
        validate(value: ReturnType<typeof transformClause>, args: ValidationArguments) {
          const [options] = args.constraints as [ClauseOptions];
          if(value === undefined) return true;
          if(!Array.isArray(value)) return false;
          return value.every(vc => {
            if(vc.isNegative && !options.allowNegative) return false;
            if(vc.value === null) return options.allowNull === true;
            if(options.checkValue && !options.checkValue(vc.value)) return false;
            return true;
          });
        },
        defaultMessage() {
          return `${propertyName}: Una sau mai multe valori sunt incorecte.`;
        }
      },
    });
  };
}

export function IsClause(options: ClauseOptions) {
  return applyDecorators(
    Transform(({ value }) => transformClause(value, options)),
    IsClauseValidator(options)
  );
}

