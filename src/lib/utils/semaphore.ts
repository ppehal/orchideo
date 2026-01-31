/**
 * Simple semaphore for concurrency control.
 * Limits the number of concurrent operations.
 */
export class Semaphore {
  private permits: number
  private waiting: Array<{
    resolve: () => void
    reject: (error: Error) => void
  }> = []

  constructor(permits: number) {
    this.permits = permits
  }

  /**
   * Acquire a permit, waiting if necessary.
   * @param timeoutMs Optional timeout in milliseconds
   * @returns A release function that must be called when done
   * @throws Error if timeout is exceeded
   */
  async acquire(timeoutMs?: number): Promise<() => void> {
    if (this.permits > 0) {
      this.permits--
      return this.createRelease()
    }

    return new Promise<() => void>((resolve, reject) => {
      const waiter = {
        resolve: () => resolve(this.createRelease()),
        reject,
      }

      this.waiting.push(waiter)

      if (timeoutMs !== undefined) {
        const timeoutId = setTimeout(() => {
          const index = this.waiting.indexOf(waiter)
          if (index !== -1) {
            this.waiting.splice(index, 1)
            reject(new Error('Semaphore acquire timeout'))
          }
        }, timeoutMs)

        // Clean up timeout if we acquire before it fires
        const originalResolve = waiter.resolve
        waiter.resolve = () => {
          clearTimeout(timeoutId)
          originalResolve()
        }
      }
    })
  }

  /**
   * Try to acquire a permit without waiting.
   * @returns A release function if acquired, null otherwise
   */
  tryAcquire(): (() => void) | null {
    if (this.permits > 0) {
      this.permits--
      return this.createRelease()
    }
    return null
  }

  /**
   * Get the number of available permits.
   */
  availablePermits(): number {
    return this.permits
  }

  /**
   * Get the number of waiters in queue.
   */
  queueLength(): number {
    return this.waiting.length
  }

  private createRelease(): () => void {
    let released = false
    return () => {
      if (released) return
      released = true
      this.release()
    }
  }

  private release(): void {
    const next = this.waiting.shift()
    if (next) {
      next.resolve()
    } else {
      this.permits++
    }
  }
}

// Global semaphore instance for PDF generation
let pdfSemaphore: Semaphore | null = null

export function getPdfSemaphore(maxConcurrent: number): Semaphore {
  if (!pdfSemaphore) {
    pdfSemaphore = new Semaphore(maxConcurrent)
  }
  return pdfSemaphore
}
