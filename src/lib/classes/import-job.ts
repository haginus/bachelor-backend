import { of, startWith, Subject } from "rxjs";
import { ImportJobStatus, ImportResult, ImportResultRow } from "../interfaces/import-response.interface";
import { v4 } from "uuid";

export class ImportJob<RowType = any, EntityType = any> {

  public id: string;
  private jobPromise: Promise<ImportResult<RowType, EntityType>> | null = null;

  public importResult: ImportResult<RowType, EntityType> = {
    summary: {
      total: 0,
      processed: 0,
      created: 0,
      updated: 0,
      failed: 0,
    },
    rows: [],
  };

  private eventsSource = new Subject<ImportJobEvent<RowType, EntityType>>();

  get isFinished() {
    return this.importResult.summary.processed === this.importResult.summary.total;
  }

  get hasStarted() {
    return this.jobPromise !== null;
  }

  constructor(
    private rows: RowType[],
    private processRow: (row: RowType, rowIndex: number) => Promise<ProcessRowResult<EntityType>>,
  ) {
    this.importResult.summary.total = rows.length;
    this.id = v4();
  }

  async start() {
    if(this.jobPromise) {
      return this.jobPromise;
    }
    this.jobPromise = this.runJob();
    return this.jobPromise;
  }

  private async runJob() {
    this.eventsSource.next({ type: 'started', totalRows: this.rows.length });
    for(let index = 0; index < this.rows.length; index++) {
      const row = this.rows[index];
      let rowResult: ImportResultRow<RowType, EntityType> = {
        rowIndex: index + 2,
        row,
        result: '' as any,
        data: null,
      }
      try {
        const result = await this.processRow(row, index);
        if(result.result === 'failed') {
          rowResult = {
            ...rowResult,
            result: 'failed',
            error: this.errorToString(result.error),
          };
        } else {
          rowResult = {
            ...rowResult,
            result: result.result,
            data: result.data,
          };
          if(result.warnings && result.warnings.length > 0) {
            rowResult.warnings = result.warnings;
          }
        }
      } catch (error) {
        rowResult = {
          ...rowResult,
          result: 'failed',
          error: this.errorToString(error),
        };
      }
      this.importResult.summary.processed++;
      this.importResult.summary[rowResult.result]++;
      this.importResult.rows.push(rowResult);
      this.eventsSource.next({ type: 'processed_row', row: rowResult });
    }
    this.eventsSource.next({ type: 'completed', importResult: this.importResult });
    this.eventsSource.complete();
    return this.importResult;
  }

  public getEvents() {
    if(this.isFinished) {
      return of({ type: 'completed', importResult: this.importResult } as ImportJobEvent<RowType, EntityType>);
    }
    return this.eventsSource.asObservable().pipe(
      startWith({ type: 'progress', importResult: this.importResult })
    );
  }

  public getStatus(): ImportJobStatus {
    return {
      jobId: this.id,
      hasStarted: this.hasStarted,
      isFinished: this.isFinished,
      summary: this.importResult.summary,
    };
  }

  private errorToString(error: unknown): string {
    if(error instanceof Error) {
      return error.message;
    }
    if(typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}

type ProcessRowResult<EntityType> = 
  | { result: 'created' | 'updated'; data: EntityType; warnings?: string[]; }
  | { result: 'failed'; error?: unknown; };

export type ImportJobEvent<RowType, EntityType> =
  | { type: 'started'; totalRows: number; }
  | { type: 'processed_row'; row: ImportResultRow<RowType, EntityType>; }
  | { type: 'progress'; importResult: ImportResult<RowType, EntityType>; }
  | { type: 'completed'; importResult: ImportResult<RowType, EntityType>; };