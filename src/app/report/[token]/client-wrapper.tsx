'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useScrollRestoration } from '@/hooks/use-scroll-restoration'

interface ReportClientWrapperProps {
  children: React.ReactNode
}

/**
 * Client wrapper for report page that adds scroll restoration functionality.
 *
 * Uses event delegation to detect when user clicks on trigger card links
 * and saves scroll position before navigation. On return, scroll position
 * is automatically restored via useScrollRestoration hook.
 *
 * This wrapper allows the report page to remain a Server Component while
 * adding client-side scroll restoration behavior.
 *
 * @param children - Report page content (server component)
 */
export function ReportClientWrapper({ children }: ReportClientWrapperProps) {
  const params = useParams()

  // Type-safe token extraction - handle undefined, array, and empty string cases
  const token =
    typeof params.token === 'string' && params.token.trim() !== '' ? params.token : undefined

  const { saveScrollPosition } = useScrollRestoration({
    key: token ? `report_${token}` : 'report_fallback',
    enabled: !!token, // Only enable if token is valid
  })

  useEffect(() => {
    if (!token) return // Skip if no valid token

    /**
     * Event delegation handler - captures clicks on trigger card links.
     * Uses narrow scope (container) instead of document for better performance.
     */
    const handleClick = (e: Event) => {
      // Only handle mouse clicks
      if (!(e instanceof MouseEvent)) return
      // Only handle left-click (button 0), ignore right-click and middle-click
      if (e.button !== 0) return

      // Type guard - ensure target is HTMLElement
      const target = e.target
      if (!(target instanceof HTMLElement)) return

      const link = target.closest('a[href*="/trigger/"]')
      if (link) {
        saveScrollPosition()
      }
    }

    // Wait for DOM to be ready, then attach listener to container
    const attachListener = () => {
      // Try to find report content container for narrow scope
      const container = document.querySelector('[data-report-content]')

      if (container) {
        // Preferred: narrow scope to trigger container
        container.addEventListener('click', handleClick)
        return () => container.removeEventListener('click', handleClick)
      } else {
        // Fallback: document-wide listener if container not found
        // (Should not happen in normal flow, but defensive programming)
        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
      }
    }

    const cleanup = attachListener()
    return cleanup
  }, [saveScrollPosition, token])

  // Passthrough wrapper - no DOM of its own
  return <>{children}</>
}
