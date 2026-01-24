export const DocumentType = {
  Generated: 'generated',
  Signed: 'signed',
  Copy: 'copy',
} as const;

export type DocumentType = typeof DocumentType[keyof typeof DocumentType];