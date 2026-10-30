/// <reference types="node" />
import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'npx tsx ./prisma/seed.ts',
  },
  datasource: {
    url:
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5433/lookaround_db?schema=public',
  },
});
