import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Vercel Serverless / Ephemeral Environment Support
let resolvedDatabaseUrl = process.env.DATABASE_URL;

if (process.env.VERCEL) {
  try {
    const tmpDbPath = '/tmp/prism.db';
    // If /tmp/prism.db doesn't exist or is empty, copy seeded prism.db into /tmp
    if (!fs.existsSync(tmpDbPath) || fs.statSync(tmpDbPath).size < 1000) {
      const candidates = [
        path.resolve(process.cwd(), 'prisma/prism.db'),
        path.resolve(__dirname, '../../../../prisma/prism.db'),
        path.resolve(__dirname, '../../../prisma/prism.db'),
        path.resolve(__dirname, '../../prisma/prism.db'),
        path.resolve(__dirname, '../prisma/prism.db'),
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).size > 1000) {
          fs.copyFileSync(cand, tmpDbPath);
          console.log(`[PRISM VERCEL] Seeded database copied from ${cand} to ${tmpDbPath}`);
          break;
        }
      }
    }

    if (!resolvedDatabaseUrl || resolvedDatabaseUrl.startsWith('file:')) {
      resolvedDatabaseUrl = `file:${tmpDbPath}`;
    }
  } catch (err) {
    console.warn('[PRISM VERCEL] SQLite tmp copy warning:', err);
  }
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: resolvedDatabaseUrl
      ? {
          db: {
            url: resolvedDatabaseUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
