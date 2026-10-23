import fs from 'fs';
import path from 'path';

// Pre-copy seeded SQLite database to /tmp on Vercel cold start
if (process.env.VERCEL) {
  try {
    const tmpDbPath = '/tmp/prism.db';
    if (!fs.existsSync(tmpDbPath) || fs.statSync(tmpDbPath).size < 1000) {
      const candidates = [
        path.resolve(process.cwd(), 'prisma/prism.db'),
        path.resolve(__dirname, '../prisma/prism.db'),
        path.resolve(__dirname, 'prisma/prism.db'),
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).size > 1000) {
          fs.copyFileSync(cand, tmpDbPath);
          console.log(`[PRISM VERCEL PRE-BOOT] Database deployed from ${cand}`);
          break;
        }
      }
    }
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
      process.env.DATABASE_URL = `file:${tmpDbPath}`;
    }
  } catch (err) {
    console.warn('[PRISM VERCEL PRE-BOOT] Warning:', err);
  }
}

import app from '../apps/api/src/server.js';

export default app;
