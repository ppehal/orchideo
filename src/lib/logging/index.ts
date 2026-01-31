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

export const log = createLogger('app')

export default log
