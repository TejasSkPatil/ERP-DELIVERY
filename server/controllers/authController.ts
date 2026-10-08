import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { InMemoryStore } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_pizza_delivery_jwt_key_2026';

// Seed pre-set accounts for testing
export const seedInitialUsers = async () => {
  const defaultAccounts = [
    {
      name: 'Admin Manager',
      email: 'admin@pizzadeliver.com',
      password: 'admin123',
      role: 'ADMIN',
    },
    {
      name: 'Rahul Sharma (DP-01)',
      email: 'delivery@pizzadeliver.com',
      password: 'delivery123',
      role: 'DELIVERY_PERSON',
    },
    {
      name: 'Amit Verma',
      email: 'customer@pizzadeliver.com',
      password: 'customer123',
      role: 'USER',
    },
  ];

  for (const acc of defaultAccounts) {
    const hashedPassword = await bcrypt.hash(acc.password, 10);
    const userData = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: acc.name,
      email: acc.email,
      password: hashedPassword,
      role: acc.role,
      createdAt: new Date(),
    };

    if (InMemoryStore.isUsingInMemory) {
      if (!InMemoryStore.users.some((u) => u.email === acc.email)) {
        InMemoryStore.users.push(userData);
      }
    } else {
      try {
        const exists = await User.findOne({ email: acc.email });
        if (!exists) {
          await User.create(userData);
        }
      } catch (err) {
        // Fallback to in-memory if MongoDB connection errors
        if (!InMemoryStore.users.some((u) => u.email === acc.email)) {
          InMemoryStore.users.push(userData);
        }
      }
    }
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user: any = null;

    if (InMemoryStore.isUsingInMemory) {
      user = InMemoryStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    } else {
      try {
        user = await User.findOne({ email: email.toLowerCase() });
      } catch {
        user = InMemoryStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: user._id?.toString() || user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user._id?.toString() || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Login failed' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'USER' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    let existing: any = null;

    if (InMemoryStore.isUsingInMemory) {
      existing = InMemoryStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    } else {
      try {
        existing = await User.findOne({ email: email.toLowerCase() });
      } catch {
        existing = InMemoryStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      }
    }

    if (existing) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: `usr-${Date.now()}`,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      createdAt: new Date(),
    };

    if (InMemoryStore.isUsingInMemory) {
      InMemoryStore.users.push(newUser);
    } else {
      try {
        await User.create(newUser);
      } catch {
        InMemoryStore.users.push(newUser);
      }
    }

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Registration failed' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.json({ user: req.user });
};
