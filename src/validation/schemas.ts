import z from 'zod';

export const registerBodySchema = z.object({
  username: z
    .string({
      error: (issue) => (issue.input === undefined ? 'Username is required' : 'Not a string'),
    })
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens',
    ),

  email: z
    .email({
      error: (issue) => (issue.input === undefined ? 'Email is required' : 'Invalid email format'),
    })
    .trim()
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase(),

  password: z
    .string({
      error: (issue) => (issue.input === undefined ? 'Password is required' : 'Not a string'),
    })
    .min(8, 'Password must be at least 8 characters')
    .max(120, 'Password must not exceed 120 characters'),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  username: z
    .string({
      error: (issue) => (issue.input === undefined ? 'Username is required' : 'Not a string'),
    })
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens',
    ),

  password: z
    .string({
      error: (issue) => (issue.input === undefined ? 'Password is required' : 'Not a string'),
    })
    .min(8, 'Password must be at least 8 characters')
    .max(120, 'Password must not exceed 120 characters'),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

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

export const postParamsSchema = z.object({
  // TODO: CHANGE IT SO THAT ID IS A NUMBER AFTER VALIDATION
  postId: z.coerce
    .number<string>({
      error: (issue) => (issue.input === undefined ? 'ID is required' : 'Must be a number'),
    })
    .int('Must be an integer')
    .positive('Must be positive')
    .transform((num) => String(num)),
});

export type PostParamsOutput = z.infer<typeof postParamsSchema>;

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
