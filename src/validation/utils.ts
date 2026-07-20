import z from 'zod';

// TODO: CHANGE IT SO THAT ID IS A NUMBER AFTER VALIDATION
export function createIdParamsSchema(paramName: string) {
  return z.object({
    [paramName]: z.coerce
      .number<string>({
        error: (issue) => (issue.input === undefined ? 'ID is required' : 'Must be a number'),
      })
      .int('Must be an integer')
      .positive('Must be positive')
      .transform((num) => String(num)),
  });
}
