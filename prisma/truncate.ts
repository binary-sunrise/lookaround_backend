import 'dotenv/config';
import { prisma } from '../src/db/client.js';

async function truncateAll() {
  console.log('Truncating all tables with CASCADE...');
  const tables = [
    'bliffe_observations',
    'bliffe_surveys',
    'bliffe_wards',
    'bliffe_projects',
    'user_profiles',
    'sessions',
    'accounts',
    'verifications',
    'users',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      console.log(`✓ Truncated: ${table}`);
    } catch (err: any) {
      console.warn(`! Could not truncate ${table}: ${err.message}`);
    }
  }

  console.log('\nAll tables have been truncated successfully!');
  await prisma.$disconnect();
}

truncateAll().catch((err) => {
  console.error('Truncate failed:', err);
  process.exit(1);
});
