/**
 * Structured JSON logger using Pino.
 *
 * Provides a singleton logger instance with child loggers for each module.
 * All logs are structured JSON — never use console.log in production code.
 *
 * Usage:
 *   import { createLogger } from '@codepulse/config/logger';
 *   const logger = createLogger('my-module');
 *   logger.info({ userId }, 'User action performed');
 */
import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';

const baseLogger = pino({
  level: LOG_LEVEL,
  ...(process.env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
  base: {
    service: 'codepulse',
    env: process.env.NODE_ENV ?? 'development',
  },
});

/**
 * Creates a child logger bound to a specific module/component.
 * @param module - Name of the module (e.g. 'adapter:github', 'worker:verify-handle')
 * @param bindings - Additional context to bind to all log entries
 */
export function createLogger(
  module: string,
  bindings?: Record<string, unknown>,
): pino.Logger {
  return baseLogger.child({ module, ...bindings });
}

/** Root logger — use createLogger() for module-specific loggers */
export const logger = baseLogger;

export default logger;
