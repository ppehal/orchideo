export interface ParsedFacebookUrl {
  type: 'username' | 'page_id' | 'profile_id'
  value: string
  originalUrl: string
}

const FB_HOSTS = ['facebook.com', 'www.facebook.com', 'fb.me', 'fb.com', 'm.facebook.com']

const RESERVED_PATHS = new Set([
  'pages',
  'groups',
  'events',
  'marketplace',
  'watch',
  'gaming',
  'live',
  'stories',
  'reels',
  'messages',
  'notifications',
  'friends',
  'bookmarks',
  'saved',
  'profile.php',
  'people',
  'settings',
  'privacy',
  'help',
  'policies',
  'ads',
  'business',
])

export function parseFacebookUrl(urlString: string): ParsedFacebookUrl | null {
  // Clean up the URL
  let cleanUrl = urlString.trim()

  // Add protocol if missing
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl
  }

  let url: URL
  try {
    url = new URL(cleanUrl)
  } catch {
    return null
  }

  // Check if it's a Facebook domain
  const hostname = url.hostname.toLowerCase()
  if (!FB_HOSTS.some((host) => hostname === host || hostname.endsWith('.' + host))) {
    return null
  }

  // Handle profile.php?id=xxx format
  if (url.pathname === '/profile.php') {
    const id = url.searchParams.get('id')
    if (id && /^\d+$/.test(id)) {
      return {
        type: 'profile_id',
        value: id,
        originalUrl: urlString,
      }
    }
    return null
  }

  // Get the pathname and remove leading/trailing slashes
  const path = url.pathname.replace(/^\/+|\/+$/g, '')

  if (!path) {
    return null
  }

  // Split path into segments
  const segments = path.split('/')

  // Handle /pages/Category/PageName/ID format
  if (segments[0] === 'pages' && segments.length >= 2) {
    // The last segment might be the page ID
    const lastSegment = segments[segments.length - 1]
    if (lastSegment && /^\d+$/.test(lastSegment)) {
      return {
        type: 'page_id',
        value: lastSegment,
        originalUrl: urlString,
      }
    }
    // Or use the page name (second to last or second segment)
    const pageName = segments.length >= 3 ? segments[segments.length - 2] : segments[1]
    if (pageName && !RESERVED_PATHS.has(pageName.toLowerCase())) {
      return {
        type: 'username',
        value: pageName,
        originalUrl: urlString,
      }
    }
    return null
  }

  // Handle simple /username format
  const firstSegment = segments[0]
  if (!firstSegment) {
    return null
  }

  // Check if it's a reserved path
  if (RESERVED_PATHS.has(firstSegment.toLowerCase())) {
    return null
  }

  // Check if it's a numeric ID
  if (/^\d+$/.test(firstSegment)) {
    return {
      type: 'page_id',
      value: firstSegment,
      originalUrl: urlString,
    }
  }

  // Otherwise, treat it as a username
  // Validate username format (alphanumeric, dots, and must be at least 5 characters)
  if (/^[a-zA-Z0-9.]+$/.test(firstSegment) && firstSegment.length >= 1) {
    return {
      type: 'username',
      value: firstSegment,
      originalUrl: urlString,
    }
  }

  return null
}

export function isValidFacebookUrl(urlString: string): boolean {
  return parseFacebookUrl(urlString) !== null
}

export function extractFacebookIdentifier(urlString: string): string | null {
  const parsed = parseFacebookUrl(urlString)
  return parsed?.value ?? null
}

export function matchPageByIdentifier(
  pages: Array<{ id: string; name: string; username?: string | null }>,
  identifier: string
): (typeof pages)[number] | null {
  const lowerIdentifier = identifier.toLowerCase()

  // First, try exact ID match
  const byId = pages.find((p) => p.id === identifier)
  if (byId) return byId

  // Then try username match (case-insensitive)
  const byUsername = pages.find((p) => p.username?.toLowerCase() === lowerIdentifier)
  if (byUsername) return byUsername

  // Then try name match (case-insensitive, with normalization)
  const normalizedIdentifier = normalizeForComparison(lowerIdentifier)
  const byName = pages.find(
    (p) => normalizeForComparison(p.name.toLowerCase()) === normalizedIdentifier
  )
  if (byName) return byName

  // Partial name match as last resort
  const byPartialName = pages.find((p) =>
    normalizeForComparison(p.name.toLowerCase()).includes(normalizedIdentifier)
  )
  if (byPartialName) return byPartialName

  return null
}

function normalizeForComparison(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .toLowerCase()
}
