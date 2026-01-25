export const DocumentUploadPerspective = {
  Student: 'student',
  Teacher: 'teacher',
  Committee: 'committee',
} as const;

export type DocumentUploadPerspective = typeof DocumentUploadPerspective[keyof typeof DocumentUploadPerspective];