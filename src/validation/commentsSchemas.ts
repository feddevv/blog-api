import z from 'zod';
import { createIdParamsSchema } from './utils.js';

export const commentsParamsSchema = createIdParamsSchema('commentId');
export type CommentsParams = z.infer<typeof commentsParamsSchema>;

export const updateCommentBodySchema = z.object({
  content: z.string('Not a string').optional(),
});
export type UpdateCommentBody = z.infer<typeof updateCommentBodySchema>;

export const createCommentBodySchema = z.object({
  content: z
    .string({
      error: (issue) => (issue.input === undefined ? 'Content is required' : 'Not a string'),
    })
    .trim()
    .min(1, 'Must be at least 1 characters')
    .max(400, 'Must not exceed 400 characters'),
});

export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;
