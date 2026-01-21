export const StudyForm = {
  IF: 'if',
  IFR: 'ifr',
  ID: 'id',
} as const;

export type StudyForm = typeof StudyForm[keyof typeof StudyForm];