type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug(tag: string, message: string, ...args: unknown[]): void;
  info(tag: string, message: string, ...args: unknown[]): void;
  warn(tag: string, message: string, ...args: unknown[]): void;
  error(tag: string, message: string, ...args: unknown[]): void;
}

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m', // gray
  info: '\x1b[34m', // blue
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};

const RESET = '\x1b[0m';

function formatTimestamp(): string {
  const now = new Date();
  return `${now.toISOString().slice(11, 23)}`;
}

function createLogger(): Logger {
  const log = (level: LogLevel, tag: string, message: string, ...args: unknown[]) => {
    const isDev = __DEV__;

    if (isDev) {
      const color = COLORS[level];
      const timestamp = formatTimestamp();
      const prefix = `${color}[${timestamp}] [${level.toUpperCase()}] [${tag}]${RESET}`;
      if (args.length > 0) {
        // eslint-disable-next-line no-console
        console[level === 'debug' ? 'log' : level](prefix, message, ...args);
      } else {
        // eslint-disable-next-line no-console
        console[level === 'debug' ? 'log' : level](prefix, message);
      }
      return;
    }

    // Production: only log warn and error (no colors)
    if (level === 'warn' || level === 'error') {
      // eslint-disable-next-line no-console
      console[level](`[${tag}]`, message, ...args);
    }
  };

  return {
    debug: (tag, message, ...args) => log('debug', tag, message, ...args),
    info: (tag, message, ...args) => log('info', tag, message, ...args),
    warn: (tag, message, ...args) => log('warn', tag, message, ...args),
    error: (tag, message, ...args) => log('error', tag, message, ...args),
  };
}

export const logger = createLogger();
