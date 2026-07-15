import z from 'zod';

export const registerSchema = z.object({
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

export type RegisterBody = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
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

export type LoginBody = z.infer<typeof loginSchema>;
