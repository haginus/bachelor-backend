export interface ImportResult<RowType, EntityType> {
  summary: {
    proccessed: number;
    created?: number;
    updated?: number;
    failed: number;
  };
  rows: {
    rowIndex: number;
    result: 'created' | 'updated' | 'failed';
    row: RowType;
    data: EntityType | null;
    error?: string;
  }[];
}