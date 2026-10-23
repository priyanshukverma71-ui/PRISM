import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { evaluateDeadlinesAndGenerateAlerts } from './alerts/evaluator.js';

// Route Imports
import authRoutes from './auth/routes.js';
import dashboardRoutes from './dashboard/routes.js';
import applicationRoutes from './applications/routes.js';
import evcRoutes from './evc/routes.js';
import complianceRoutes from './compliance/routes.js';
import documentRoutes from './documents/routes.js';
import alertRoutes from './alerts/routes.js';
import simulationRoutes from './simulation/routes.js';
import auditRoutes from './audit/routes.js';
import configRoutes from './config/routes.js';
import ruleRoutes from './rules/routes.js';
import reportRoutes from './reports/routes.js';
import healthRoutes from './health/routes.js';

const app = express();

// Security & Utility Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Allow 3D canvas and frontend assets
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/evc', evcRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/config', configRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/health', healthRoutes);

// Root fallback
app.get('/', (req, res) => {
  res.json({
    name: 'PRISM Regulatory Intelligence API',
    status: 'ONLINE',
    version: '1.0.0',
    endpoints: '/api/health',
  });
});

// Centralized error handler
app.use(errorHandler);

// Background Worker for Deadline Evaluation (Every 10 minutes)
let alertInterval: NodeJS.Timeout | null = null;
if (config.nodeEnv !== 'test' && !process.env.VERCEL) {
  alertInterval = setInterval(async () => {
    try {
      console.log('[PRISM SCHEDULER] Running scheduled deadline and SLA risk evaluation...');
      const res = await evaluateDeadlinesAndGenerateAlerts();
      if (res.alertsGenerated > 0 || res.escalationsTriggered > 0) {
        console.log(`[PRISM SCHEDULER] Generated ${res.alertsGenerated} alerts, ${res.escalationsTriggered} escalations.`);
      }
    } catch (err) {
      console.error('[PRISM SCHEDULER ERROR]', err);
    }
  }, 10 * 60 * 1000);
}

// Start Server (only if not running on Vercel Serverless)
let server: any = null;
if (!process.env.VERCEL && config.nodeEnv !== 'test') {
  server = app.listen(config.port, () => {
    console.log(`\n======================================================`);
    console.log(`  PRISM — Proactive Regulatory Intelligence Platform  `);
    console.log(`  Server online on port ${config.port} (${config.nodeEnv})`);
    console.log(`  Timezone: ${config.timezone}`);
    console.log(`======================================================\n`);
  });
}

// Graceful Shutdown
function handleShutdown(signal: string) {
  console.log(`\n[PRISM] Received ${signal}. Gracefully terminating server...`);
  if (alertInterval) clearInterval(alertInterval);
  if (server) {
    server.close(() => {
      console.log('[PRISM] Server shutdown complete.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default app;
