export interface FileGenerationStatus {
  /** Percentage of file generation completed (0-1) */
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  lastGeneratedAt?: Date;
  filePath?: string;
}