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
  state: z.enum(['PUBLISHED', 'UNPUBLISHED', 'HIDDEN']).optional(),
  search: z.string().optional(),
  limit: z.transform((str) => (str ? parseInt(str as string, 10) : 10)).optional(),
  page: z.transform((str) => (str ? parseInt(str as string, 10) : 1)).optional(),
});

export type FilterQueryOutput = z.infer<typeof filterPostsQuerySchema>;
