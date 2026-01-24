export const CivilState = {
  NotMarried: 'not_married',
  Married: 'married',
  Divorced: 'divorced',
  Widow: 'widow',
  ReMarried: 're_married',
} as const;

export type CivilState = typeof CivilState[keyof typeof CivilState];