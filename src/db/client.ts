import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  (process.env.DB_HOST && process.env.DB_USER
    ? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'bliffe_db'}`
    : 'postgresql://postgres:postgres@localhost:5432/lookaround_db?schema=public');

const isLocalhost =
  connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

/**
 * Configure SSL for AWS RDS or remote PostgreSQL.
 * AWS RDS PostgreSQL requires SSL/TLS. When verifying certificates,
 * the Amazon RDS Root CA certificate (global-bundle.pem) can be supplied.
 */
function getSslConfiguration(): PoolConfig['ssl'] {
  if (isLocalhost || process.env.DATABASE_SSL === 'false') {
    return false;
  }

  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true';

  // 1. Direct inline CA certificate via env
  if (process.env.RDS_CA_CERT) {
    return {
      rejectUnauthorized,
      ca: process.env.RDS_CA_CERT,
    };
  }

  // 2. CA bundle file path (custom or default certs/global-bundle.pem)
  const candidatePaths = [
    process.env.RDS_CA_BUNDLE_PATH,
    path.resolve(process.cwd(), 'certs', 'global-bundle.pem'),
    path.resolve(__dirname, '../../certs/global-bundle.pem'),
  ].filter(Boolean) as string[];

  for (const certPath of candidatePaths) {
    try {
      if (fs.existsSync(certPath)) {
        const ca = fs.readFileSync(certPath, 'utf8');
        return {
          rejectUnauthorized,
          ca,
        };
      }
    } catch {
      // Continue searching next candidate path
    }
  }

  return { rejectUnauthorized };
}

/**
 * Connection pool configuration optimized for PostgreSQL / AWS RDS Free Tier
 */
export const poolConfig: PoolConfig = {
  connectionString,
  ssl: getSslConfiguration(),
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '5000', 10),
  keepAlive: true,
  keepAliveInitialDelayMillis: parseInt(process.env.DB_KEEP_ALIVE_INITIAL_DELAY_MS || '10000', 10),
};

// Initialize PostgreSQL pool and Prisma PG adapter
export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool] Unexpected idle client error:', err.message);
});

const adapter = new PrismaPg(pool);

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}

/**
 * Health check utility to verify database connectivity and SSL state
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  version?: string;
  ssl?: boolean;
  error?: string;
}> {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT 
          version(), 
          current_database() AS db_name,
          (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS is_ssl
      `);
      return {
        connected: true,
        version: res.rows[0]?.version,
        ssl: Boolean(res.rows[0]?.is_ssl),
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      connected: false,
      error: err.message,
    };
  }
}

export default prisma;
