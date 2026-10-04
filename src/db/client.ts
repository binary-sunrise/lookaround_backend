import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/lookaround_db?schema=public';

// Automatically configure SSL for remote managed databases (Neon, Supabase, Render, Koyeb)
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const useSsl =
  process.env.DATABASE_SSL === 'true' ||
  (!isLocalhost && (process.env.NODE_ENV === 'production' || connectionString.includes('sslmode=')));

const pool = new Pool({
  connectionString,
  ssl: useSsl
    ? {
        rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
      }
    : undefined,
});
const adapter = new PrismaPg(pool);

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}

export default prisma;
