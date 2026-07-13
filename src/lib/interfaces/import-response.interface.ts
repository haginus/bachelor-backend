export type ImportResponse<RowType, EntityType> =
  | ImportJobStatus
  | ImportResult<RowType, EntityType>;


export type ImportJobStatus = {
  jobId: string;
  hasStarted: boolean;
  isFinished: boolean;
  summary: ImportResultSummary;
};

export interface ImportResult<RowType, EntityType> {
  summary: ImportResultSummary;
  rows: ImportResultRow<RowType, EntityType>[];
}

export interface ImportResultSummary {
  total: number;
  processed: number;
  created: number;
  updated: number;
  failed: number;
}

export interface ImportResultRow<RowType, EntityType> {
  rowIndex: number;
  result: 'created' | 'updated' | 'failed';
  row: RowType;
  data: EntityType | null;
  error?: string;
  warnings?: string[];
}