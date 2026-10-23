import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { EMBEDDED_DB_GZIP_BASE64 } from './seedDbData.js';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

export function ensureDatabaseReady(): string {
  let dbUrl = process.env.DATABASE_URL;

  // Remote databases (PostgreSQL, Supabase, Neon) pass through directly
  if (dbUrl && !dbUrl.startsWith('file:')) {
    return dbUrl;
  }

  // Detect serverless or Vercel environment
  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.env.NODE_ENV === 'production';

  if (isServerless) {
    const tmpDbPath = '/tmp/prism.db';
    let isHydrated = false;

    // Check if valid database already exists in /tmp
    try {
      if (fs.existsSync(tmpDbPath)) {
        const stats = fs.statSync(tmpDbPath);
        if (stats.size > 20000) {
          isHydrated = true;
        }
      }
    } catch {
      isHydrated = false;
    }

    if (!isHydrated) {
      // 1. First attempt: Copy from disk if present in bundle
      const candidates = [
        path.resolve(process.cwd(), 'prisma/prism.db'),
        path.resolve(currentDir, '../../../../prisma/prism.db'),
        path.resolve(currentDir, '../../../prisma/prism.db'),
        path.resolve(currentDir, '../../prisma/prism.db'),
        path.resolve(currentDir, '../prisma/prism.db'),
        path.resolve(currentDir, './prism.db'),
      ];

      for (const cand of candidates) {
        try {
          if (fs.existsSync(cand) && fs.statSync(cand).size > 20000) {
            fs.copyFileSync(cand, tmpDbPath);
            console.log(`[PRISM] Seeded database copied from ${cand} to ${tmpDbPath}`);
            isHydrated = true;
            break;
          }
        } catch {
          // continue
        }
      }

      // 2. Fallback: Inflate from embedded gzipped seed data (100% reliable guarantee)
      if (!isHydrated) {
        try {
          const gzippedBuffer = Buffer.from(EMBEDDED_DB_GZIP_BASE64, 'base64');
          const decompressed = zlib.gunzipSync(gzippedBuffer);
          fs.writeFileSync(tmpDbPath, decompressed);
          console.log(`[PRISM] Hydrated database from embedded seed data (${decompressed.length} bytes) to ${tmpDbPath}`);
          isHydrated = true;
        } catch (err) {
          console.error('[PRISM] Failed to inflate embedded database:', err);
        }
      }
    }

    dbUrl = `file:${tmpDbPath}`;
    process.env.DATABASE_URL = dbUrl;
    return dbUrl;
  }

  // Local development: fallback to local prisma/prism.db if DATABASE_URL is not set
  if (!dbUrl) {
    const defaultLocalDb = path.resolve(process.cwd(), 'prisma/prism.db');
    dbUrl = `file:${defaultLocalDb.replace(/\\/g, '/')}`;
    process.env.DATABASE_URL = dbUrl;
  }

  return dbUrl;
}

const resolvedDatabaseUrl = ensureDatabaseReady();

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
