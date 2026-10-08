import mongoose from 'mongoose';

// In-memory fallback store if MongoDB Atlas is offline or credentials unset
export class InMemoryStore {
  static users: any[] = [];
  static deliveries: any[] = [];
  static isUsingInMemory = false;
}

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[AI Studio] MONGODB_URI not set. Initializing resilient in-memory data store.');
    InMemoryStore.isUsingInMemory = true;
    return;
  }

  try {
    mongoose.set('bufferCommands', false); // Fail fast, don't hang
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[AI Studio] Connected to MongoDB Atlas successfully.');
  } catch (error: any) {
    console.warn('[AI Studio] MongoDB Atlas connection failed:', error?.message);
    console.warn('[AI Studio] Falling back to in-memory store so the app continues running.');
    InMemoryStore.isUsingInMemory = true;
  }
};
