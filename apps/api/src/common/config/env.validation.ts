import { z } from 'zod';

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
    API_PREFIX: z.string().min(1).default('api'),
    API_VERSION: z
      .string()
      .regex(/^v\d+$/)
      .default('v1'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    SAFETY_ENCRYPTION_KEY: z.string().min(32).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production' && !value.SAFETY_ENCRYPTION_KEY)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SAFETY_ENCRYPTION_KEY'],
        message: 'is required in production',
      });
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const result = environmentSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Environment validation failed: ${result.error.message}`);
  }

  return result.data;
}
