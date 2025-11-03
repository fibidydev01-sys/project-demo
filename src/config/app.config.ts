// ===== FILE: src/config/app.config.ts (COMPLETE) =====
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  // Server Configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  // URLs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  apiUrl: process.env.API_URL || 'http://localhost:3000',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3001', 'http://localhost:5173'],

  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // Debug Flags
  debug: {
    enabled: process.env.DEBUG === 'true',
    prisma: process.env.DEBUG_PRISMA === 'true',
    redis: process.env.DEBUG_REDIS === 'true',
  },

  // Timezone & Locale
  timezone: process.env.TZ || 'Asia/Jakarta',
  locale: process.env.LOCALE || 'id-ID',

  // Feature Flags
  features: {
    seedOnStartup: process.env.SEED_ON_STARTUP === 'true',
    swaggerEnabled: process.env.NODE_ENV !== 'production',
  },
}));
