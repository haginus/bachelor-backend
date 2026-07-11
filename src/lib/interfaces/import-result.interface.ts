export interface ImportResult<RowType, EntityType> {
  summary: {
    processed: number;
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