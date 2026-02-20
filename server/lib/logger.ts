/**
 * Structured logging system for better production debugging
 * Provides consistent log formatting with levels, timestamps, and metadata
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
  stack?: string;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.level = this.parseLogLevel(process.env.LOG_LEVEL) || LogLevel.INFO;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  private parseLogLevel(level: string | undefined): LogLevel | null {
    if (!level) return null;
    const normalized = level.toLowerCase();
    return Object.values(LogLevel).includes(normalized as LogLevel)
      ? (normalized as LogLevel)
      : null;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Development: Human-readable format with colors
      const levelColors: Record<LogLevel, string> = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m',  // Green
        [LogLevel.WARN]: '\x1b[33m',  // Yellow
        [LogLevel.ERROR]: '\x1b[31m'  // Red
      };
      const reset = '\x1b[0m';
      const color = levelColors[entry.level];

      let output = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`;

      if (entry.meta) {
        output += `\n  ${JSON.stringify(entry.meta, null, 2)}`;
      }

      if (entry.stack) {
        output += `\n  Stack: ${entry.stack}`;
      }

      return output;
    } else {
      // Production: JSON format for log aggregators
      return JSON.stringify(entry);
    }
  }

  private log(level: LogLevel, message: string, meta?: any, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(meta && { meta }),
      ...(error?.stack && { stack: error.stack })
    };

    const formatted = this.formatLog(entry);

    // Use appropriate console method
    switch (level) {
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.DEBUG:
      case LogLevel.INFO:
      default:
        console.log(formatted);
        break;
    }
  }

  /**
   * Log debug information (only in development or when LOG_LEVEL=debug)
   */
  debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Log general information
   */
  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Log warning messages
   */
  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Log error messages
   */
  error(message: string, metaOrError?: any | Error): void {
    if (metaOrError instanceof Error) {
      this.log(LogLevel.ERROR, message, undefined, metaOrError);
    } else {
      this.log(LogLevel.ERROR, message, metaOrError);
    }
  }

  /**
   * Create a child logger with additional context
   * Useful for adding request-specific metadata
   */
  child(context: Record<string, any>): ChildLogger {
    return new ChildLogger(this, context);
  }
}

/**
 * Child logger that includes additional context with every log
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private context: Record<string, any>
  ) {}

  private mergeContext(meta?: any): any {
    if (!meta) return this.context;
    return { ...this.context, ...meta };
  }

  debug(message: string, meta?: any): void {
    this.parent.debug(message, this.mergeContext(meta));
  }

  info(message: string, meta?: any): void {
    this.parent.info(message, this.mergeContext(meta));
  }

  warn(message: string, meta?: any): void {
    this.parent.warn(message, this.mergeContext(meta));
  }

  error(message: string, metaOrError?: any | Error): void {
    if (metaOrError instanceof Error) {
      this.parent.error(message, metaOrError);
    } else {
      this.parent.error(message, this.mergeContext(metaOrError));
    }
  }
}

// Export singleton logger instance
export const logger = new Logger();
