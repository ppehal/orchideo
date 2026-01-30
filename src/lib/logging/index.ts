import pino, { type Logger, type LoggerOptions } from 'pino'

type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel

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
