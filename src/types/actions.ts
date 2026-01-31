/**
 * Standard result type for server actions (mutations).
 *
 * - Query functions (getX, listX) can throw - errors go to error boundary
 * - Mutation functions MUST return ActionResult - never throw
 *
 * @example
 * // Success
 * return { success: true, data: createdItem }
 * return { success: true, id: "123" }
 *
 * // Error
 * return { success: false, error: "Nepodařilo se uložit" }
 */
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  id?: string | number
}

/**
 * Helper type for pagination responses
 */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
