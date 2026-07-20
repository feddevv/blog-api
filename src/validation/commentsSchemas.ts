import z from 'zod';
import { createIdParamsSchema } from './utils.js';

export const commentsParamsSchema = createIdParamsSchema('commentId');
export type CommentsParams = z.infer<typeof commentsParamsSchema>;

export const createCommentBodySchema = z.object({
  content: z.string('Not a string').optional(),
});
export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;
