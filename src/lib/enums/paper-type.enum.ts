export const PaperType = {
  Bachelor: 'bachelor',
  Diploma: 'diploma',
  Master: 'master',
} as const;

export type PaperType = typeof PaperType[keyof typeof PaperType];