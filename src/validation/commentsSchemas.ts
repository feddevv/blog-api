import z from 'zod';
import { createIdParamsSchema } from './utils.js';

export const commentsParamsSchema = createIdParamsSchema('commentId');
export type CommentsParams = z.infer<typeof commentsParamsSchema>;
