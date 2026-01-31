
import { Transform } from 'class-transformer';
import { applyDecorators } from '@nestjs/common';
import { IsOptional, IsDate as _IsDate } from 'class-validator';
import { stripTime } from '../utils';

function toDate(value: any): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;

  if (typeof value === 'string') {
    return new Date(value);
  }
  return undefined;
}

export function IsDate(options?: { optional?: boolean; stripTime?: boolean }) {
  return applyDecorators(
    Transform(({ value }) => {
      const date = toDate(value);
      if(date && options?.stripTime) {
        return stripTime(date);
      }
      return date;
    }),
    options?.optional !== false ? IsOptional() : (target: any) => target,
    _IsDate(),
  );
}