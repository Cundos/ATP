export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEY_PATTERN = /password|secret|token|authorization|cookie|client_secret|database_url|(^|_)(api_?key|key|auth|credential)($|_)/i;
const CONNECTION_STRING_PATTERN = /postgres(ql)?:\/\/([^:]+):([^@]+)@/gi;

/**
 * Sanitiza recursivamente cadenas, objetos y arrays para enmascarar información sensible.
 */
export function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data.replace(CONNECTION_STRING_PATTERN, 'postgres$1://$2:***@');
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: sanitizeData(data.message),
    };
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        sanitizedObj[key] = '***REDACTED***';
      } else {
        sanitizedObj[key] = sanitizeData(val);
      }
    }
    return sanitizedObj;
  }

  return String(data);
}

export class AppLogger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  public forContext(context: string): AppLogger {
    return new AppLogger(context);
  }

  public debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, metadata);
  }

  public info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  public warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata);
  }

  public error(message: string, errorOrMeta?: unknown): void {
    let metadata: Record<string, unknown> | undefined;

    if (errorOrMeta instanceof Error) {
      metadata = {
        errorName: errorOrMeta.name,
        errorMessage: errorOrMeta.message,
      };
    } else if (typeof errorOrMeta === 'object' && errorOrMeta !== null) {
      metadata = errorOrMeta as Record<string, unknown>;
    } else if (errorOrMeta !== undefined) {
      metadata = { detail: String(errorOrMeta) };
    }

    this.log('error', message, metadata);
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message: sanitizeData(message) as string,
    };

    if (metadata && Object.keys(metadata).length > 0) {
      entry.metadata = sanitizeData(metadata) as Record<string, unknown>;
    }

    const output = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}${
      entry.metadata ? ' ' + JSON.stringify(entry.metadata) : ''
    }`;

    switch (level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }
}

export const logger = new AppLogger('Server');
