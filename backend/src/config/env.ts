import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

// Define strict environment schema with validation
const environmentSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z
    .string({
      required_error: 'MONGODB_URI is required. Please set MONGODB_URI in your .env file.',
    })
    .min(1, 'MONGODB_URI must not be empty.'),
  APP_TIMEZONE: z.string().default('Asia/Kolkata'),
  RETENTION_DAYS: z.coerce.number().int().positive().default(32),
  MAX_UPLOAD_SIZE: z.coerce.number().int().positive().default(5242880),
  JWT_SECRET: z.string().optional(),
});

export type EnvironmentSchema = z.infer<typeof environmentSchema>;

/**
 * Validates environment variables at application startup.
 * Halts execution immediately if critical required variables (such as MONGODB_URI) are missing.
 */
export const validateEnv = (): EnvironmentSchema => {
  const result = environmentSchema.safeParse({
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    MONGODB_URI: process.env.MONGODB_URI,
    APP_TIMEZONE: process.env.APP_TIMEZONE || process.env.TIMEZONE,
    RETENTION_DAYS: process.env.RETENTION_DAYS,
    MAX_UPLOAD_SIZE: process.env.MAX_UPLOAD_SIZE,
    JWT_SECRET: process.env.JWT_SECRET,
  });

  if (!result.success) {
    console.error('====================================================');
    console.error('❌ [FATAL] Environment Configuration Validation Failed');
    console.error('====================================================');
    result.error.issues.forEach((issue) => {
      console.error(` - Variable: ${issue.path.join('.')} -> ${issue.message}`);
    });
    console.error('====================================================\n');
    throw new Error(
      `Startup aborted: Missing or invalid environment configuration: ${result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`
    );
  }

  return result.data;
};

// Execute startup validation
export const validatedConfig = validateEnv();

// Centralized configuration export (No hardcoded secrets)
export const config = {
  port: Number(validatedConfig.PORT),
  nodeEnv: validatedConfig.NODE_ENV,
  mongodbUri: validatedConfig.MONGODB_URI,
  appTimezone: validatedConfig.APP_TIMEZONE,
  retentionDays: validatedConfig.RETENTION_DAYS,
  maxUploadSize: validatedConfig.MAX_UPLOAD_SIZE,
  jwtSecret: validatedConfig.JWT_SECRET || '',
};

// Backward-compatible env object for existing services
export const env = {
  PORT: String(config.port),
  NODE_ENV: config.nodeEnv,
  MONGODB_URI: config.mongodbUri,
  APP_TIMEZONE: config.appTimezone,
  TIMEZONE: config.appTimezone,
  RETENTION_DAYS: String(config.retentionDays),
  MAX_UPLOAD_SIZE: String(config.maxUploadSize),
  JWT_SECRET: config.jwtSecret,
};

export default env;
