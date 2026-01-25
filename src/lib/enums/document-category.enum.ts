export const DocumentCategory = {
  PaperFiles: 'paper_files',
  SecretaryFiles: 'secretary_files',
} as const;

export type DocumentCategory = typeof DocumentCategory[keyof typeof DocumentCategory];