/**
 * Health Check Endpoint
 *
 * Returns health status for monitoring and Docker healthchecks.
 *
 * Usage:
 * - Docker healthcheck: curl http://localhost:3000/api/health
 * - Returns 200 if healthy, 503 if database unreachable
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logging'

const log = createLogger('api-health')

interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  database: 'ok' | 'error'
  latency_ms?: number
}

export async function GET() {
  const start = Date.now()
  let dbOk = false

  try {
    await prisma.$queryRaw`SELECT 1`
    dbOk = true
  } catch (error) {
    log.error({ error }, 'Health check: database connection failed')
  }

  const latency = Date.now() - start

  const response: HealthResponse = {
    status: dbOk ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbOk ? 'ok' : 'error',
    latency_ms: latency,
  }

  return NextResponse.json(response, {
    status: dbOk ? 200 : 503,
  })
}
