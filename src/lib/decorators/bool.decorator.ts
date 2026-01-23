import { Transform } from 'class-transformer';
import { applyDecorators } from '@nestjs/common';
import { IsBoolean, IsOptional } from 'class-validator';

function toBoolean(value: any): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const v = value.toLowerCase();
    if (['true', '1'].includes(v)) return true;
    if (['false', '0'].includes(v)) return false;
  }

  return undefined;
}

export function Bool(options?: { optional?: boolean }) {
  return applyDecorators(
    Transform(({ value }) => toBoolean(value)),
    options?.optional !== false ? IsOptional() : (target: any) => target,
    IsBoolean(),
  );
}