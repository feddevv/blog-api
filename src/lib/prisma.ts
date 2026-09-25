import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString:
    process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production'
      ? process.env.DATABASE_URL
      : process.env.DATABASE_URL_TEST,
});

const prisma = new PrismaClient({ adapter });

export { prisma };
