import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, {
    // production-এ index deploy-এর সময় আলাদা করে বানানো হবে (spec NFR-OPS-007)
    autoIndex: env.NODE_ENV !== 'production',
  });
  logger.info('MongoDB connected');
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

export const isDbReady = (): boolean => mongoose.connection.readyState === 1;