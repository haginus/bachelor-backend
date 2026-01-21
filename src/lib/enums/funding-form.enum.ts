export const FundingForm = {
  Budget: 'budget',
  Tax: 'tax',
} as const;

export type FundingForm = typeof FundingForm[keyof typeof FundingForm];