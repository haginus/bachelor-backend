export const UserType = {
  Admin: 'admin',
  Secretary: 'secretary',
  Student: 'student',
  Teacher: 'teacher',
} as const;

export type UserType = typeof UserType[keyof typeof UserType];