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