import { ensureDatabaseReady } from '../apps/api/src/lib/prisma.js';

// Pre-hydrate database if needed on cold start
try {
  ensureDatabaseReady();
} catch (err) {
  console.warn('[PRISM VERCEL ENTRY] ensureDatabaseReady warning:', err);
}

import app from '../apps/api/src/server.js';

export default app;
