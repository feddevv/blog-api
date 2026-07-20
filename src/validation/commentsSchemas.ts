import z from 'zod';

export const commentsParamsSchema = z.object({
  commentId: z.coerce
    .number<string>({
      error: (issue) => (issue.input === undefined ? 'ID is required' : 'Must be a number'),
    })
    .int('Must be an integer')
    .positive('Must be positive')
    .transform((num) => String(num)),
});

export type CommentsParamsOutput = z.infer<typeof commentsParamsSchema>;
