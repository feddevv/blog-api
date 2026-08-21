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
  title: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z
      .string('Not a string')
      .min(5, 'Title must be at least 5 characters')
      .max(255, 'Title most not exceed 255 characters')
      .default('Untitled'),
  ),

  description: z
    .string('Not a string')
    .trim()
    .max(300, 'Description should not exceed 300 characters')
    .optional(),

  content: z.string().trim().optional(),

  state: z.enum(['PUBLISHED', 'HIDDEN', 'DRAFT']).optional(),
});

export type CreatePostBody = z.infer<typeof createPostBodySchema>;

export const updatePostBodySchema = z.object({
  title: z
    .string('Not a string')
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(255, 'Title must not exceed 255 characters')
    .optional(),

  description: z
    .string('Not a string')
    .trim()
    .max(300, 'Description should not exceed 300 characters')
    .optional(),

  content: z.string().trim().optional(),

  state: z.enum(['PUBLISHED', 'HIDDEN', 'DRAFT']).optional(),
});

export type UpdatePostBody = z.infer<typeof updatePostBodySchema>;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const imageFileSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.enum(ACCEPTED_IMAGE_TYPES, 'Only JPEG, PNG and WEBP are supported'),
  size: z.number().max(MAX_FILE_SIZE, 'File size must not exceed 5 MB'),
  buffer: z.instanceof(Buffer, {
    error: 'File must be stored in memory',
  }),
});
