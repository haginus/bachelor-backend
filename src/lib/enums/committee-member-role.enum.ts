export const CommitteeMemberRole = {
  President: 'president',
  Secretary: 'secretary',
  Member: 'member',
} as const;

export type CommitteeMemberRole = typeof CommitteeMemberRole[keyof typeof CommitteeMemberRole];