import { Document, Types } from 'mongoose';

export type UserRole = 'ADMIN' | 'DELIVERY_PERSON' | 'USER';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface IUser {
  _id?: Types.ObjectId | string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends Document {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: UserRole;
}
