import { describe, it, expect } from 'vitest'
import { serializeError, LogFields } from '../index'

describe('serializeError', () => {
  it('serializes Error instance with message and stack', () => {
    const error = new Error('Test error')
    const serialized = serializeError(error)

    expect(serialized).toHaveProperty('name', 'Error')
    expect(serialized).toHaveProperty('message', 'Test error')
    expect(serialized).toHaveProperty('stack')
    expect(typeof serialized.stack).toBe('string')
  })

  it('serializes nested Error cause', () => {
    const cause = new Error('Root cause')
    const error = new Error('Main error', { cause })
    const serialized = serializeError(error)

    expect(serialized.cause).toBeDefined()
    expect((serialized.cause as Record<string, unknown>).message).toBe('Root cause')
  })

  it('handles unknown error types', () => {
    const error = { custom: 'error', code: 500 }
    const serialized = serializeError(error)

    expect(serialized).toHaveProperty('error')
  })

  it('handles string errors', () => {
    const serialized = serializeError('Something went wrong')
    expect(serialized).toEqual({ error: 'Something went wrong' })
  })
})

describe('LogFields', () => {
  it('provides consistent field names', () => {
    expect(LogFields.userId).toBe('user_id')
    expect(LogFields.analysisId).toBe('analysis_id')
    expect(LogFields.requestId).toBe('request_id')
  })
})
