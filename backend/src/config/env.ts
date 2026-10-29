import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const DEFAULT_MONGODB_URI =
  'mongodb+srv://tejasspatil2601_db_user:teju2601@cluster0.lrwwmfo.mongodb.net/?appName=Cluster0';
const DEFAULT_JWT_SECRET = 'my_super_secret_key_999!';

// Define strict environment schema with validation
const environmentSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1).default(DEFAULT_MONGODB_URI),
  APP_TIMEZONE: z.string().default('Asia/Kolkata'),
  RETENTION_DAYS: z.coerce.number().int().positive().default(32),
  MAX_UPLOAD_SIZE: z.coerce.number().int().positive().default(5242880),
  JWT_SECRET: z.string().default(DEFAULT_JWT_SECRET),
});

export type EnvironmentSchema = z.infer<typeof environmentSchema>;

/**
 * Validates environment variables at application startup.
 * Uses sensible cluster defaults if hosted platform variables are unset.
 */
export const validateEnv = (): EnvironmentSchema => {
  const result = environmentSchema.safeParse({
    PORT: process.env.PORT || '3001',
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGODB_URI: process.env.MONGODB_URI || DEFAULT_MONGODB_URI,
    APP_TIMEZONE: process.env.APP_TIMEZONE || process.env.TIMEZONE || 'Asia/Kolkata',
    RETENTION_DAYS: process.env.RETENTION_DAYS || 32,
    MAX_UPLOAD_SIZE: process.env.MAX_UPLOAD_SIZE || 5242880,
    JWT_SECRET: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
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
