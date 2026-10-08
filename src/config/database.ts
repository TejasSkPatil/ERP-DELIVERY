import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Utility to sanitize MongoDB connection strings so passwords/secrets are never printed.
 */
export const sanitizeMongoUri = (uri?: string): string => {
  if (!uri) return '[UNDEFINED_URI]';
  return uri.replace(/:([^:@]+)@/, ':****@');
};

let isGracefulShutdownConfigured = false;

/**
 * Configures process signal listeners for graceful database connection termination.
 */
const setupGracefulShutdown = (): void => {
  if (isGracefulShutdownConfigured) return;
  isGracefulShutdownConfigured = true;

  const closeConnection = async (signal: string) => {
    console.log(`\n[MongoDB] Received ${signal}. Closing MongoDB connection gracefully...`);
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        console.log('[MongoDB] Connection cleanly terminated.');
      }
      process.exit(0);
    } catch (error: any) {
      console.error('[MongoDB] Error closing connection during shutdown:', error.message);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => closeConnection('SIGINT'));
  process.on('SIGTERM', () => closeConnection('SIGTERM'));
};

/**
 * Connects the backend application to MongoDB Atlas using Mongoose.
 * Validates MONGODB_URI, masks credentials, logs connection status, and handles graceful shutdowns.
 */
export const connectDatabase = async (): Promise<typeof mongoose> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const errorMsg = 'MONGODB_URI environment variable is not defined.';
    console.error(`[MongoDB] Connection Failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const sanitized = sanitizeMongoUri(uri);
  console.log(`[MongoDB] Connecting to MongoDB Atlas: ${sanitized}`);

  try {
    // Setup mongoose connection lifecycle listeners
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Runtime database connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Database disconnected.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[MongoDB] Database reconnected successfully.');
    });

    // Establish connection to MongoDB Atlas
    const conn = await mongoose.connect(uri, {
      dbName: 'erp_delivery',
      serverSelectionTimeoutMS: 8000,
    });

    console.log(
      `[MongoDB] Successfully connected to MongoDB Atlas! (Host: ${mongoose.connection.host}, Database: ${mongoose.connection.name})`
    );

    // Register graceful shutdown handlers
    setupGracefulShutdown();

    return conn;
  } catch (error: any) {
    console.error(
      `[MongoDB] Failed to connect to MongoDB Atlas at ${sanitized}: ${error.message}`
    );
    throw error;
  }
};

export default connectDatabase;
