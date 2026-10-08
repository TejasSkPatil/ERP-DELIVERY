import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

export const BUCKET_NAME = 'deliverySlips';

let bucketInstance: GridFSBucket | null = null;

/**
 * Retrieves or initializes the deliverySlips MongoDB GridFS bucket instance.
 * Throws a descriptive database error if the MongoDB connection is not active.
 */
export const getGridFSBucket = (): GridFSBucket => {
  if (bucketInstance) {
    return bucketInstance;
  }

  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('Database connection is not open. Unable to access GridFS bucket: deliverySlips.');
  }

  bucketInstance = new GridFSBucket(mongoose.connection.db, {
    bucketName: BUCKET_NAME,
  });

  return bucketInstance;
};

export default getGridFSBucket;
