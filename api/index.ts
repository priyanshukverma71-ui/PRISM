import fs from 'fs';
import path from 'path';

// If deployed on Vercel with SQLite fallback, copy prism.db to /tmp so it is writable
if (process.env.VERCEL) {
  try {
    const tmpDbPath = '/tmp/prism.db';
    if (!fs.existsSync(tmpDbPath)) {
      const localDbPath = path.resolve(process.cwd(), 'prisma/prism.db');
      if (fs.existsSync(localDbPath)) {
        fs.copyFileSync(localDbPath, tmpDbPath);
      }
    }
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
      process.env.DATABASE_URL = `file:${tmpDbPath}`;
    }
  } catch (e) {
    console.warn('Vercel SQLite tmp setup warning:', e);
  }
}

import app from '../apps/api/src/server.js';

export default app;
