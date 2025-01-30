import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  port: z.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('production'),
  mongoUri: z.string(),
  corsOrigins: z.array(z.string()).default(['*']),
});

const parseConfig = () => {
  try {
    return configSchema.parse({
      port: parseInt(process.env.PORT || '3000', 10),
      nodeEnv: process.env.NODE_ENV,
      mongoUri: process.env.MONGODB_URI,
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
    throw error;
  }
};

export const config = parseConfig();
