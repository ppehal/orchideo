import pino, { type Logger, type LoggerOptions } from 'pino'

const VALID_LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const
type LogLevel = (typeof VALID_LOG_LEVELS)[number]

function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase()
  if (envLevel && VALID_LOG_LEVELS.includes(envLevel as LogLevel)) {
    return envLevel as LogLevel
  }
  return 'info'
}

const LOG_LEVEL = getLogLevel()

const isDevelopment = process.env.NODE_ENV === 'development'

const baseOptions: LoggerOptions = {
  level: LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      hostname: bindings.hostname,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'access_token',
      'page_access_token',
      'refresh_token',
      '*.access_token',
      '*.page_access_token',
      '*.refresh_token',
      'headers.authorization',
      'headers.cookie',
    ],
    remove: true,
  },
}

const devTransport = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:HH:MM:ss',
    ignore: 'pid,hostname',
  },
}

const rootLogger = pino({
  ...baseOptions,
  ...(isDevelopment && { transport: devTransport }),
})

export interface LogContext {
  analysis_id?: string
  fb_page_id?: string
  user_id?: string
  trigger_code?: string
  request_id?: string
  [key: string]: unknown
}

export function createLogger(name: string, context?: LogContext): Logger {
  return rootLogger.child({ name, ...context })
}

export function withContext(logger: Logger, context: LogContext): Logger {
  return logger.child(context)
}

/**
 * Properly serialize Error objects for Pino logging.
 * Handles Error instances, unknown errors, and nested causes.
 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause ? serializeError(error.cause) : undefined,
      // Preserve any additional enumerable properties
      ...Object.getOwnPropertyNames(error).reduce(
        (acc, key) => {
          if (!['name', 'message', 'stack', 'cause'].includes(key)) {
            acc[key] = (error as unknown as Record<string, unknown>)[key]
          }
          return acc
        },
        {} as Record<string, unknown>
      ),
    }
  }

  if (typeof error === 'object' && error !== null) {
    return { error: JSON.parse(JSON.stringify(error)) }
  }

  return { error: String(error) }
}

/**
 * Log error with proper serialization.
 * Use this instead of log.error({ error }, msg).
 *
 * @example
 * try {
 *   await riskyOperation()
 * } catch (error) {
 *   logError(log, error, 'Operation failed', { userId, analysisId })
 * }
 */
export function logError(
  logger: Logger,
  error: unknown,
  message: string,
  context?: LogContext
): void {
  logger.error(
    {
      ...context,
      err: serializeError(error),
    },
    message
  )
}

/**
 * Create a child logger with request context.
 * Useful for tracing requests across async operations.
 *
 * @example
 * const requestLog = withRequestContext(log, request)
 * requestLog.info('Processing request')
 */
export function withRequestContext(
  logger: Logger,
  request: { headers: Headers; url: string }
): Logger {
  const requestId = request.headers.get('x-request-id') || generateRequestId()
  const userAgent = request.headers.get('user-agent')
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]

  return logger.child({
    request_id: requestId,
    user_agent: userAgent,
    ip_address: ip,
    path: new URL(request.url).pathname,
  })
}

/**
 * Generate unique request ID for tracing.
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Standard context field names (use these consistently).
 */
export const LogFields = {
  // User context
  userId: 'user_id',
  userEmail: 'user_email',
  userName: 'user_name',

  // Analysis context
  analysisId: 'analysis_id',
  analysisStatus: 'analysis_status',

  // Facebook context
  fbPageId: 'fb_page_id',
  fbPageName: 'fb_page_name',

  // Request context
  requestId: 'request_id',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',

  // Performance
  durationMs: 'duration_ms',
  responseSize: 'response_size',

  // Error context
  errorCode: 'error_code',
  errorType: 'error_type',
} as const

export const log = createLogger('app')

export default log
