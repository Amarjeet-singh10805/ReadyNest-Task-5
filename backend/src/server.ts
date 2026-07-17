import 'express-async-errors';
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { execSync } from 'child_process';
import app from './app';
import { initializeSocket } from './sockets';
import { logger } from './config/logger';
import { prisma } from './config/database';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initializeSocket(server);

const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection:', reason);
  server.close(() => process.exit(1));
});
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  server.close(() => process.exit(1));
});

server.listen(PORT, async () => {
  try {
    // Auto-run migrations on every deploy in production
    if (process.env.NODE_ENV === 'production') {
      logger.info('Running database migrations...');
      try {
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        logger.info('✅ Migrations complete');
      } catch (err) {
        logger.warn('Migration warning (may already be applied)');
      }
    }
    await prisma.$connect();
    logger.info(`✅ Database connected`);
    logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }
});

export default server;
