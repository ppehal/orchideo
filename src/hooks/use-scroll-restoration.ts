'use client'

import { useEffect, useCallback } from 'react'

interface UseScrollRestorationOptions {
  key: string
  enabled?: boolean
}

interface SavedScrollPosition {
  scrollY: number
  viewportWidth: number
}

/**
 * Custom hook for scroll position restoration across navigation.
 *
 * Saves scroll position to sessionStorage when navigating away and restores it
 * when returning to the page. Includes responsive-awareness (viewport width check)
 * and accessibility support (prefers-reduced-motion).
 *
 * Known limitations:
 * - If viewport width changes significantly (>±100px) between save and restore,
 *   restoration will be skipped to prevent scrolling to wrong content
 * - Focus is not restored, only scroll position
 * - SessionStorage must be available (graceful degradation in private browsing)
 *
 * @param key - Unique identifier for the scroll position (e.g., 'report_token123')
 * @param enabled - Whether scroll restoration is enabled (default: true)
 *
 * @returns Object with saveScrollPosition function to call before navigation
 *
 * @example
 * const { saveScrollPosition } = useScrollRestoration({
 *   key: `report_${token}`,
 *   enabled: true,
 * })
 *
 * // Call before navigating away
 * saveScrollPosition()
 */
export function useScrollRestoration({
  key,
  enabled = true,
}: UseScrollRestorationOptions): {
  saveScrollPosition: () => void
} {
  const isValid = typeof window !== 'undefined' && !!key && key.trim() !== ''

  /**
   * Saves current scroll position with viewport width to sessionStorage.
   * Viewport width is saved to detect responsive layout changes.
   */
  const saveScrollPosition = useCallback(() => {
    if (!isValid || !enabled || typeof window === 'undefined') return

    try {
      const data: SavedScrollPosition = {
        scrollY: window.scrollY,
        viewportWidth: window.innerWidth,
      }

      sessionStorage.setItem(`scroll_${key}`, JSON.stringify(data))
    } catch (error) {
      // SessionStorage quota exceeded or disabled (private browsing)
      // Fail silently - scroll restoration is a nice-to-have feature
      console.warn('[useScrollRestoration] Failed to save scroll position:', error)
    }
  }, [key, enabled, isValid])

  /**
   * Restores scroll position from sessionStorage on mount.
   * Uses double RAF to ensure DOM is fully hydrated and layout is complete.
   */
  useEffect(() => {
    if (!isValid || !enabled || typeof window === 'undefined') return

    const savedData = sessionStorage.getItem(`scroll_${key}`)
    if (!savedData) return

    try {
      const parsed = JSON.parse(savedData)

      // Runtime type validation - ensure data has correct shape
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof parsed.scrollY !== 'number' ||
        typeof parsed.viewportWidth !== 'number'
      ) {
        // Invalid data format - cleanup and skip restoration
        sessionStorage.removeItem(`scroll_${key}`)
        console.warn('[useScrollRestoration] Invalid data format in sessionStorage')
        return
      }

      const data: SavedScrollPosition = parsed

      // Responsive safety: Only restore if viewport width is similar (±100px tolerance)
      // This prevents scroll to wrong position after responsive layout change
      // (e.g., desktop 2-column → mobile 1-column)
      const widthDiff = Math.abs(data.viewportWidth - window.innerWidth)
      if (widthDiff > 100) {
        // Viewport changed significantly, skip restoration
        sessionStorage.removeItem(`scroll_${key}`)
        return
      }

      // Check user's motion preference for accessibility
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches

      // Double RAF ensures DOM is fully hydrated and layout is complete
      // First RAF: waits for browser paint
      // Second RAF: waits for next frame (ensures all components are mounted)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: data.scrollY,
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
          })

          // Clean up after restoration to prevent restoring again
          sessionStorage.removeItem(`scroll_${key}`)
        })
      })
    } catch (error) {
      // Invalid JSON or other error - clean up and ignore
      sessionStorage.removeItem(`scroll_${key}`)
      console.warn('[useScrollRestoration] Failed to restore scroll position:', error)
    }
  }, [key, enabled, isValid])

  return { saveScrollPosition }
}
