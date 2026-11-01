import { pool, prisma, checkDatabaseConnection } from '../src/db/client';
import dotenv from 'dotenv';

dotenv.config();

async function runCheck() {
  console.log('='.repeat(65));
  console.log('🔍 Testing Database Connection & Configuration');
  console.log('='.repeat(65));

  const connectionString = process.env.DATABASE_URL || '';
  const maskedUrl = connectionString.replace(/:([^@]+)@/, ':****@');
  console.log(`📌 Target URL: ${maskedUrl || '(none)'}`);

  const isAwsRds = connectionString.includes('rds.amazonaws.com');
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  if (isAwsRds) {
    console.log('🌐 Provider: AWS RDS PostgreSQL');
  } else if (isLocal) {
    console.log('💻 Provider: Local PostgreSQL');
  } else {
    console.log('🔗 Provider: Remote PostgreSQL Server');
  }

  const startTime = Date.now();

  try {
    const health = await checkDatabaseConnection();
    const durationMs = Date.now() - startTime;

    if (!health.connected) {
      console.error('\n❌ Connection Failed:');
      console.error(`   ${health.error}`);
      console.log('\nTroubleshooting Checklist:');
      console.log('  1. Check RDS status in AWS Console (must be "Available").');
      console.log('  2. Verify Security Group Inbound Rule allows TCP port 5432 from your current IP.');
      console.log('  3. Ensure Public Access is set to "Yes" on the RDS instance if connecting from outside VPC.');
      console.log('  4. Check DB username, password, and database name in DATABASE_URL.');
      process.exit(1);
    }

    console.log(`\n✅ Connection Successful! (Latency: ${durationMs} ms)`);

    if (pool) {
      const client = await pool.connect();
      try {
        const statsRes = await client.query(`
          SELECT 
            current_database() AS db_name,
            current_user AS db_user,
            inet_server_addr() AS server_ip,
            inet_server_port() AS server_port,
            current_setting('max_connections') AS max_conns,
            (SELECT count(*) FROM pg_stat_activity) AS active_conns,
            (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS ssl_active,
            (SELECT cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS ssl_cipher,
            (SELECT version FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS ssl_proto_ver
        `);

        const stats = statsRes.rows[0];
        console.log('\n📊 Database Details:');
        console.log(`   Database:         ${stats.db_name}`);
        console.log(`   Connected User:   ${stats.db_user}`);
        console.log(`   Server IP / Port: ${stats.server_ip || 'N/A'}:${stats.server_port || 5432}`);
        console.log(`   PostgreSQL Ver:   ${health.version?.split(' on ')[0] || 'Unknown'}`);
        console.log('\n🔒 SSL / TLS Status:');
        console.log(`   SSL Active:       ${stats.ssl_active ? 'YES (Encrypted)' : 'NO'}`);
        console.log(`   TLS Protocol:     ${stats.ssl_proto_ver || 'N/A'}`);
        console.log(`   Cipher:           ${stats.ssl_cipher || 'N/A'}`);
        console.log('\n🏊 Connection Pool & Capacity:');
        console.log(`   Server Max Conns: ${stats.max_conns} (RDS Free tier standard: ~85-100)`);
        console.log(`   Current Active:   ${stats.active_conns}`);
        console.log(`   App Pool Max:     ${process.env.DB_POOL_MAX || 10}`);
      } finally {
        client.release();
      }
    }

    // Test Prisma ORM query
    const userCount = await prisma.user.count().catch(() => null);
    if (userCount !== null) {
      console.log(`\n🛡️ Prisma ORM Test: Successfully queried 'users' table (${userCount} users found).`);
    } else {
      console.log('\n🛡️ Prisma ORM Test: Connected, but tables may need migrations. Run "npm run db:migrate".');
    }

    console.log('\n' + '='.repeat(65));
    console.log('🎉 Database configuration is operational and ready!');
    console.log('='.repeat(65));
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Unexpected Error During Verification:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
    await prisma.$disconnect();
  }
}

runCheck();

