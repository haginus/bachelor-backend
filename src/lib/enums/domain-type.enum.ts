export const DomainType = {
  Bachelor: 'bachelor',
  Master: 'master',
} as const;

export type DomainType = typeof DomainType[keyof typeof DomainType];