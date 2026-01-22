export interface Paginated<T> {
  rows: T[];
  count: number;
}