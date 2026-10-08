import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { InMemoryDatabase } from '../config/database';
import env from '../config/env';
import { TokenPayload, UserRole } from '../types';

export const authService = {
  login: async (email: string, password?: string, roleFallback?: UserRole) => {
    let user: any = null;

    if (InMemoryDatabase.isUsingFallback) {
      user = InMemoryDatabase.users.find((u) => u.email === email);
      if (!user) {
        user = {
          id: `usr-${Date.now()}`,
          name: email.split('@')[0],
          email,
          role: roleFallback || 'DELIVERY_PERSON',
        };
        InMemoryDatabase.users.push(user);
      }
    } else {
      user = await User.findOne({ email });
      if (!user && roleFallback) {
        const hash = await bcrypt.hash(password || 'delivery123', 10);
        user = await User.create({
          name: email.split('@')[0],
          email,
          password: hash,
          role: roleFallback,
        });
      }
    }

    const payload: TokenPayload = {
      id: user.id || user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });

    return { token, user: payload };
  },
};

export default authService;
