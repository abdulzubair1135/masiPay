import mongoose from 'mongoose';
import { ENV } from './env.js';

export const connectDB = async (retries = 5, delay = 3000): Promise<typeof mongoose> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[MongoDB] Connecting to database (Attempt ${attempt}/${retries})...`);
      const conn = await mongoose.connect(ENV.MONGODB_URI, {
        autoIndex: false, // Prevents duplicate index warnings on production
        serverSelectionTimeoutMS: 10000,
      });
      console.log(`[MongoDB] ✅ Successfully connected to database: ${conn.connection.name} @ ${conn.connection.host}`);
      return conn;
    } catch (error: any) {
      console.error(`[MongoDB] Connection attempt ${attempt} failed:`, error.message || error);
      if (attempt === retries) {
        console.error('[MongoDB] ❌ All connection attempts exhausted. Exiting.');
        process.exit(1);
      }
      console.log(`[MongoDB] Retrying connection in ${delay / 1000}s...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  process.exit(1);
};
