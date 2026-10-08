import { connectDatabase, sanitizeMongoUri } from '../../../src/config/database';

export const InMemoryDatabase = {
  isUsingFallback: false,
  users: [] as any[],
  deliveries: [] as any[],
};

export { connectDatabase, sanitizeMongoUri };
export default connectDatabase;
