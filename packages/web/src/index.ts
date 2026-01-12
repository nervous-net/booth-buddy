import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { PrismaClient, validateEnv, getEnv } from '@booth-buddy/shared';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { authLimiter, adminLimiter, webhookLimiter, scanLimiter } from './middleware/rate-limit';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import scanRoutes from './routes/scan';
import webhookRoutes from './routes/webhooks';

// Validate environment variables
const env = validateEnv();

// Initialize Prisma client
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Create Express app
const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.shopify.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.shopify.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.myshopify.com"],
      frameSrc: ["'self'", "https://*.myshopify.com"],
      frameAncestors: ["'self'", "https://*.myshopify.com", "https://admin.shopify.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check (before rate limiting)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhooks need raw body for HMAC verification - before JSON parsing
app.use('/webhooks', webhookLimiter, express.raw({ type: 'application/json' }), webhookRoutes);

// JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser for CSRF
app.use(cookieParser());

// Rate limiting by route type
app.use('/auth', authLimiter);
app.use('/admin', adminLimiter);
app.use('/scan', scanLimiter);

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/scan', scanRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('Connected to database');

    app.listen(PORT, () => {
      console.log(`Booth Buddy server running on port ${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

start();

export default app;
