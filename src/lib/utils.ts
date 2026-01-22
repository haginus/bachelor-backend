import fs from 'fs';
import path from 'path';

export function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function safePath(...args: string[]): string {
  const resultedPath = path.join(...args);
  fs.mkdirSync(path.dirname(resultedPath), { recursive: true });
  return resultedPath;
}