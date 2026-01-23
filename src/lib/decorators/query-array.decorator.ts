import { Transform } from 'class-transformer';
import { applyDecorators } from '@nestjs/common';
import { IsArray, IsOptional } from 'class-validator';

function toQueryArray(value: any, mapFn?: (v: any) => any): any[] | undefined {
  function getArray(v: any): any[] | undefined {
    if (v === undefined || v === null) return undefined;
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      return v.split(',').map(item => item.trim());
    }
    return undefined;
  }
  const arr = getArray(value);
  return arr && mapFn ? arr.map(mapFn) : arr;
}

export function QueryArray(options?: { optional?: boolean; mapFn?: (v: any) => any }) {
  return applyDecorators(
    Transform(({ value }) => toQueryArray(value, options?.mapFn)),
    options?.optional !== false ? IsOptional() : (target: any) => target,
    IsArray(),
  );
}