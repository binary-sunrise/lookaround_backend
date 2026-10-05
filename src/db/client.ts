import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { neonConfig } from '@neondatabase/serverless';
import { Pool } from 'pg';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/lookaround_db?schema=public';

const isNeon = connectionString.includes('neon.tech');

let adapter: any;
if (isNeon) {
  neonConfig.webSocketConstructor = ws;
  adapter = new PrismaNeon({ connectionString });
} else {
  const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString,
    ssl: !isLocalhost && process.env.DATABASE_SSL !== 'false'
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' }
      : undefined,
  });
  pool.on('error', (err) => {
    console.warn('[DB Pool] Connection error:', err.message);
  });
  adapter = new PrismaPg(pool);
}

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

