import type { TriggerRule, TriggerCategory } from './types'

// Registry of all trigger rules
const triggerRegistry: Map<string, TriggerRule> = new Map()

/**
 * Register a trigger rule
 */
export function registerTrigger(rule: TriggerRule): void {
  if (triggerRegistry.has(rule.id)) {
    console.warn(`Trigger ${rule.id} is already registered, overwriting`)
  }
  triggerRegistry.set(rule.id, rule)
}

/**
 * Get a trigger rule by ID
 */
export function getTrigger(id: string): TriggerRule | undefined {
  return triggerRegistry.get(id)
}

/**
 * Get all registered trigger rules
 */
export function getAllTriggers(): TriggerRule[] {
  return Array.from(triggerRegistry.values())
}

/**
 * Get trigger rules by category
 */
export function getTriggersByCategory(category: TriggerCategory): TriggerRule[] {
  return getAllTriggers().filter((t) => t.category === category)
}

/**
 * Clear the registry (useful for testing)
 */
export function clearRegistry(): void {
  triggerRegistry.clear()
}

/**
 * Get count of registered triggers
 */
export function getTriggerCount(): number {
  return triggerRegistry.size
}

/**
 * Check if a trigger is registered
 */
export function hasTrigger(id: string): boolean {
  return triggerRegistry.has(id)
}
