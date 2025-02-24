import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  port: z.number().default(3000),
  nodeEnv: z.enum(["development", "production", "test"]).default("production"),
  corsOrigins: z.array(z.string()).default(["*"]),
});

const parseConfig = () => {
  try {
    return configSchema.parse({
      port: parseInt(process.env.PORT || "3000", 10),
      nodeEnv: process.env.NODE_ENV,
      corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["*"],
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Configuration validation failed: ${error.message}`);
      }
      throw error;
    }
    throw new Error("Unknown error occurred during configuration validation");
  }
};

export const config = parseConfig();
