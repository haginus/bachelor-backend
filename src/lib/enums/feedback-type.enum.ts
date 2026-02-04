export const FeedbackType = {
  Data: 'data',
  Feedback: 'feedback',
  Bug: 'bug',
  Question: 'question',
} as const;

export type FeedbackType = typeof FeedbackType[keyof typeof FeedbackType];