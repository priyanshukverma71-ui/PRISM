import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'prism_default_secret_dev_key_regulatory_2025',
  sessionExpiresIn: process.env.SESSION_EXPIRES_IN || '8h',
  timezone: process.env.TIMEZONE || 'Asia/Kolkata',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 500,
  },
};
