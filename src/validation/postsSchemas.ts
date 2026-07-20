import z from 'zod';
import { createIdParamsSchema } from './utils.js';

export const filterPostsQuerySchema = z.object({
  state: z
    .enum(['PUBLISHED', 'HIDDEN', 'DRAFT'], 'Must be one of (PUBLISHED, HIDDEN, DRAFT)')
    .optional(),
  search: z.string('Not a string').optional(),
  limit: z
    .string()
    .transform((str) => (str ? parseInt(str, 10) : 10))
    .pipe(z.number('Not a number').int('Must be an integer').positive('Must be positive'))
    .optional(),
  page: z
    .string()
    .transform((str) => (str ? parseInt(str, 10) : 1))
    .pipe(z.number('Not a number').int('Must be an integer').positive('Must be positive'))
    .optional(),
});

export type FilterQueryOutput = z.infer<typeof filterPostsQuerySchema>;

export const postParamsSchema = createIdParamsSchema('postId');
export type PostParams = z.infer<typeof postParamsSchema>;

export const createPostBodySchema = z.object({
  title: z
    .string({
      error: (issue) => (issue.input === undefined ? 'Title is required' : 'Not a string'),
    })
    .min(5, 'Title must be at least 5 characters')
    .max(255, 'Title must not exceed 255 characters'),

  content: z.string().optional(),

  state: z.enum(['PUBLISHED', 'HIDDEN', 'DRAFT']).optional(),
});

export type CreatePostBody = z.infer<typeof createPostBodySchema>;

export const updatePostBodySchema = z.object({
  title: z
    .string('Not a string')
    .min(5, 'Title must be at least 5 characters')
    .max(255, 'Title must not exceed 255 characters')
    .optional(),

  content: z.string().optional(),

  state: z.enum(['PUBLISHED', 'HIDDEN', 'DRAFT']).optional(),
});

export type UpdatePostBody = z.infer<typeof updatePostBodySchema>;
