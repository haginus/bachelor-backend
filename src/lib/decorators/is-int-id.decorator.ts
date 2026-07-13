
import { Transform } from 'class-transformer';
import { applyDecorators } from '@nestjs/common';
import { IsInt, IsOptional, Min } from 'class-validator';

export function IsIntId(options?: { message?: string; optional?: boolean; min?: number }) {
  return applyDecorators(
    Transform(({ value }) => {
      if(value === undefined || value === null) return undefined;
      if(value instanceof Number) return value;
      return parseInt(value, 10);
    }),
    options?.optional !== false ? IsOptional() : (target: any) => target,
    IsInt({ message: options?.message }),
    Min(options?.min ?? 1, { message: options?.message }),
  );
}