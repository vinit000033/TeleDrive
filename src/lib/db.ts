// lib/db.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cachedConnection: typeof mongoose | null = null;

export async function connectToDatabase() {
  if (cachedConnection) {
    console.log('Reusing MongoDB connection');
    return cachedConnection;
  }

  console.log('Connecting to MongoDB...');
  const conn = await mongoose.connect(MONGODB_URI);
  cachedConnection = conn;
  console.log('MongoDB connected');
  return conn;
}