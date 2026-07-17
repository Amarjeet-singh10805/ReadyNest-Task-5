import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'saas-platform' },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), json())
          : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), simple()),
    }),
  ],
});

logger.on('error', (error) => {
  console.error('Logger error:', error);
});
