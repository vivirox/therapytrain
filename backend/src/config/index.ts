import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  port: z.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  mongoUri: z.string(),
  corsOrigins: z.array(z.string()).default(['http://localhost:5173']),
  kindeClientId: z.string(),
  kindeClientSecret: z.string(),
  kindeDomain: z.string(),
  kindeAudience: z.string().optional(),
  kindeIssuer: z.string().optional(),
});

const parseConfig = () => {
  try {
    return configSchema.parse({
      port: parseInt(process.env.PORT || '3000', 10),
      nodeEnv: process.env.NODE_ENV,
      mongoUri: process.env.MONGODB_URI,
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
      kindeClientId: process.env.KINDE_CLIENT_ID,
      kindeClientSecret: process.env.KINDE_CLIENT_SECRET,
      kindeDomain: process.env.KINDE_DOMAIN,
      kindeAudience: process.env.KINDE_AUDIENCE,
      kindeIssuer: process.env.KINDE_ISSUER,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
    throw error;
  }
};

export const config = parseConfig();
