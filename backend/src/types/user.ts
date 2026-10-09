import { Document, Types } from 'mongoose';

export type UserRole = 'ADMIN' | 'DELIVERY_PERSON';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface IUser {
  _id?: Types.ObjectId | string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  status?: UserStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends Document {
  name: string;
  username?: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserResponse {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: UserRole;
  status?: UserStatus;
}
