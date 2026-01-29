import fs from 'fs';
import path from 'path';

export function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function inclusiveDate(date: Date): Date {
  const strippedDate = stripTime(date);
  strippedDate.setDate(strippedDate.getDate() + 1);
  return strippedDate;
}

export function isDateInInclusiveRange(date: Date, startDate: Date, endDate: Date): boolean {
  const strippedStartDate = stripTime(startDate);
  const strippedEndDate = inclusiveDate(endDate);
  return date >= strippedStartDate && date < strippedEndDate;
}

export function safePath(...args: string[]): string {
  const resultedPath = path.join(...args);
  fs.mkdirSync(path.dirname(resultedPath), { recursive: true });
  return resultedPath;
}

export function indexArray<T, K extends string | number>(array: T[], getKey: (item: T) => K) {
  return array.reduce((acc, item) => {
    acc[getKey(item)] = item;
    return acc;
  }, {} as Record<K, T>);
}

export function groupBy<T, K extends string | number>(array: T[], getKey: (item: T) => K) {
  return array.reduce((acc, item) => {
    const key = getKey(item);
    if(!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

export function uniqueArray<T, K extends string | number>(array: T[], getKey: (item: T) => K): T[] {
  const index = indexArray(array, getKey);
  return Object.values(index);
}

export function unaccent(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function toComparable(value: string | number | Date): string | number {
  if(value instanceof Date) {
    return value.getTime();
  }
  return value;
}

type GetValueFn<T> = (item: T) => string | number | Date;

type SortCriterion<T> = 
  | GetValueFn<T>
  | {
    getValue: GetValueFn<T>;
    direction?: 'asc' | 'desc';
  };

export function sortArray<T>(array: T[], criteria: SortCriterion<T>[]): T[] {
  function sortFn(a: T, b: T): number {
    for(const criterion of criteria) {
      const getValue = typeof criterion === 'function' ? criterion : criterion.getValue;
      const direction = typeof criterion === 'function' ? 'asc' : criterion.direction ?? 'asc';
      const dir = direction === 'desc' ? -1 : 1;
      const aValue = toComparable(getValue(a));
      const bValue = toComparable(getValue(b));
      if (aValue < bValue) return -1 * dir;
      if (aValue > bValue) return 1 * dir;
    }
    return 0;
  };
  return array.sort(sortFn);
}