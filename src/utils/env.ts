import { z } from 'zod';

const envSchema = z.object({
  // Email Configuration
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email address'),

  // Redis Configuration
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),

  // Optional variables with defaults
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `- ${err.path.join('.')}: ${err.message}`);
      throw new Error(
        'Missing or invalid environment variables:\n' + missingVars.join('\n')
      );
    }
    throw error;
  }
}

// Validate environment variables immediately in production
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}

export const env = validateEnv(); 