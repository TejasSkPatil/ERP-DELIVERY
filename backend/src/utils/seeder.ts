import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Delivery } from '../models/Delivery';
import { InMemoryDatabase } from '../config/database';
import { getKolkataDateInfo } from './timeZone';

export const seedDatabaseIfEmpty = async () => {
  if (InMemoryDatabase.isUsingFallback) {
    return;
  }

  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Seeder] Seeding default accounts into MongoDB Atlas...');
      const adminHash = await bcrypt.hash('admin123', 10);
      const deliveryHash = await bcrypt.hash('delivery123', 10);
      const userHash = await bcrypt.hash('user123', 10);

      await User.create([
        {
          name: 'Admin Manager',
          email: 'admin@pizzadeliver.com',
          phone: '+91 9820011223',
          password: adminHash,
          role: 'ADMIN',
        },
        {
          name: 'Rahul Sharma (DP-01)',
          email: 'delivery@pizzadeliver.com',
          phone: '+91 9820022334',
          password: deliveryHash,
          role: 'DELIVERY_PERSON',
        },
        {
          name: 'Amit Verma',
          email: 'customer@pizzadeliver.com',
          phone: '+91 9820033445',
          password: userHash,
          role: 'USER',
        },
      ]);
      console.log('[Seeder] Default user accounts seeded.');
    }

    const deliveryCount = await Delivery.countDocuments();
    if (deliveryCount === 0) {
      console.log('[Seeder] Seeding initial delivery proofs into MongoDB Atlas...');
      const { deliveryDate } = getKolkataDateInfo(new Date());

      const now = new Date();
      await Delivery.create([
        {
          receiptNo: '7',
          deliveryDate,
          uploadedAt: now,
          status: 'DELIVERED',
        },
        {
          receiptNo: '14',
          deliveryDate,
          uploadedAt: now,
          status: 'DELIVERED',
        },
        {
          receiptNo: '19',
          deliveryDate,
          uploadedAt: now,
          status: 'DELIVERED',
        },
        {
          receiptNo: '21',
          deliveryDate,
          uploadedAt: now,
          status: 'DELIVERED',
        },
        {
          receiptNo: '24',
          deliveryDate,
          uploadedAt: now,
          status: 'DELIVERED',
        },
      ]);
      console.log('[Seeder] Initial delivery proofs seeded into MongoDB Atlas.');
    }
  } catch (error: any) {
    console.warn('[Seeder] Seeding warning:', error.message);
  }
};

export default seedDatabaseIfEmpty;
