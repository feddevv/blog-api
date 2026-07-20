import z from 'zod';

// TODO: CHANGE IT SO THAT ID IS A NUMBER AFTER VALIDATION
export function createIdParamsSchema<K extends string>(paramName: K) {
  return z.object({
    [paramName]: z.coerce
      .number<string>({
        error: (issue) => (issue.input === undefined ? 'ID is required' : 'Must be a number'),
      })
      .int('Must be an integer')
      .positive('Must be positive')
      .transform((num) => String(num)),
    // TODO: CHANGE TYPE ASSERTION
  } as Record<K, z.ZodPipe<z.z.ZodCoercedNumber<string>, z.ZodTransform<string, number>>>);
}
