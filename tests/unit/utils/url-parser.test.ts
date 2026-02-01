import { describe, it, expect } from 'vitest'
import {
  parseFacebookUrl,
  isValidFacebookUrl,
  extractFacebookIdentifier,
  matchPageByIdentifier,
} from '@/lib/utils/url-parser'

describe('URL Parser Utils', () => {
  describe('parseFacebookUrl', () => {
    describe('valid Facebook URLs', () => {
      it('parses simple username URL', () => {
        const result = parseFacebookUrl('https://facebook.com/MyPage')
        expect(result).toEqual({
          type: 'username',
          value: 'MyPage',
          originalUrl: 'https://facebook.com/MyPage',
        })
      })

      it('parses URL without protocol', () => {
        const result = parseFacebookUrl('facebook.com/TestPage')
        expect(result).toEqual({
          type: 'username',
          value: 'TestPage',
          originalUrl: 'facebook.com/TestPage',
        })
      })

      it('parses URL with www prefix', () => {
        const result = parseFacebookUrl('https://www.facebook.com/MyBusiness')
        expect(result).toEqual({
          type: 'username',
          value: 'MyBusiness',
          originalUrl: 'https://www.facebook.com/MyBusiness',
        })
      })

      it('parses mobile Facebook URL', () => {
        const result = parseFacebookUrl('https://m.facebook.com/MobilePage')
        expect(result).toEqual({
          type: 'username',
          value: 'MobilePage',
          originalUrl: 'https://m.facebook.com/MobilePage',
        })
      })

      it('parses fb.com short URL', () => {
        const result = parseFacebookUrl('https://fb.com/ShortPage')
        expect(result).toEqual({
          type: 'username',
          value: 'ShortPage',
          originalUrl: 'https://fb.com/ShortPage',
        })
      })

      it('parses fb.me short URL', () => {
        const result = parseFacebookUrl('https://fb.me/ShorterPage')
        expect(result).toEqual({
          type: 'username',
          value: 'ShorterPage',
          originalUrl: 'https://fb.me/ShorterPage',
        })
      })

      it('parses numeric page ID URL', () => {
        const result = parseFacebookUrl('https://facebook.com/123456789')
        expect(result).toEqual({
          type: 'page_id',
          value: '123456789',
          originalUrl: 'https://facebook.com/123456789',
        })
      })

      it('parses profile.php?id= URL', () => {
        const result = parseFacebookUrl('https://facebook.com/profile.php?id=100012345678901')
        expect(result).toEqual({
          type: 'profile_id',
          value: '100012345678901',
          originalUrl: 'https://facebook.com/profile.php?id=100012345678901',
        })
      })

      it('parses /pages/Category/PageName/ID format', () => {
        const result = parseFacebookUrl(
          'https://facebook.com/pages/Restaurants/MyRestaurant/123456'
        )
        expect(result).toEqual({
          type: 'page_id',
          value: '123456',
          originalUrl: 'https://facebook.com/pages/Restaurants/MyRestaurant/123456',
        })
      })

      it('parses /pages/PageName format without ID', () => {
        const result = parseFacebookUrl('https://facebook.com/pages/MyPageName')
        expect(result).toEqual({
          type: 'username',
          value: 'MyPageName',
          originalUrl: 'https://facebook.com/pages/MyPageName',
        })
      })

      it('handles URL with trailing slash', () => {
        const result = parseFacebookUrl('https://facebook.com/MyPage/')
        expect(result).toEqual({
          type: 'username',
          value: 'MyPage',
          originalUrl: 'https://facebook.com/MyPage/',
        })
      })

      it('handles URL with query parameters', () => {
        const result = parseFacebookUrl('https://facebook.com/MyPage?ref=homepage')
        expect(result).toEqual({
          type: 'username',
          value: 'MyPage',
          originalUrl: 'https://facebook.com/MyPage?ref=homepage',
        })
      })

      it('handles username with dots', () => {
        const result = parseFacebookUrl('https://facebook.com/my.page.name')
        expect(result).toEqual({
          type: 'username',
          value: 'my.page.name',
          originalUrl: 'https://facebook.com/my.page.name',
        })
      })

      it('handles whitespace around URL', () => {
        const result = parseFacebookUrl('  https://facebook.com/MyPage  ')
        expect(result?.value).toBe('MyPage')
      })
    })

    describe('invalid Facebook URLs', () => {
      it('returns null for non-Facebook domains', () => {
        expect(parseFacebookUrl('https://twitter.com/MyPage')).toBeNull()
        expect(parseFacebookUrl('https://instagram.com/MyPage')).toBeNull()
        expect(parseFacebookUrl('https://google.com')).toBeNull()
      })

      it('returns null for Facebook homepage without path', () => {
        expect(parseFacebookUrl('https://facebook.com')).toBeNull()
        expect(parseFacebookUrl('https://facebook.com/')).toBeNull()
      })

      it('returns null for reserved paths', () => {
        expect(parseFacebookUrl('https://facebook.com/groups')).toBeNull()
        expect(parseFacebookUrl('https://facebook.com/events')).toBeNull()
        expect(parseFacebookUrl('https://facebook.com/marketplace')).toBeNull()
        expect(parseFacebookUrl('https://facebook.com/watch')).toBeNull()
        expect(parseFacebookUrl('https://facebook.com/settings')).toBeNull()
        expect(parseFacebookUrl('https://facebook.com/messages')).toBeNull()
        expect(parseFacebookUrl('https://facebook.com/help')).toBeNull()
      })

      it('returns null for profile.php without valid ID', () => {
        expect(parseFacebookUrl('https://facebook.com/profile.php')).toBeNull()
        expect(parseFacebookUrl('https://facebook.com/profile.php?id=abc')).toBeNull()
      })

      it('returns null for invalid URL format', () => {
        expect(parseFacebookUrl('not-a-url')).toBeNull()
        expect(parseFacebookUrl('')).toBeNull()
        expect(parseFacebookUrl('   ')).toBeNull()
      })

      it('returns null for pages path with reserved name', () => {
        const result = parseFacebookUrl('https://facebook.com/pages/groups')
        expect(result).toBeNull()
      })
    })
  })

  describe('isValidFacebookUrl', () => {
    it('returns true for valid Facebook page URLs', () => {
      expect(isValidFacebookUrl('https://facebook.com/MyPage')).toBe(true)
      expect(isValidFacebookUrl('https://www.facebook.com/MyPage')).toBe(true)
      expect(isValidFacebookUrl('facebook.com/MyPage')).toBe(true)
    })

    it('returns false for invalid URLs', () => {
      expect(isValidFacebookUrl('https://twitter.com/MyPage')).toBe(false)
      expect(isValidFacebookUrl('https://facebook.com')).toBe(false)
      expect(isValidFacebookUrl('not-a-url')).toBe(false)
    })
  })

  describe('extractFacebookIdentifier', () => {
    it('extracts username from valid URL', () => {
      expect(extractFacebookIdentifier('https://facebook.com/MyPage')).toBe('MyPage')
    })

    it('extracts page ID from numeric URL', () => {
      expect(extractFacebookIdentifier('https://facebook.com/123456')).toBe('123456')
    })

    it('returns null for invalid URL', () => {
      expect(extractFacebookIdentifier('https://twitter.com/MyPage')).toBeNull()
      expect(extractFacebookIdentifier('invalid')).toBeNull()
    })
  })

  describe('matchPageByIdentifier', () => {
    const testPages = [
      { id: '123456', name: 'My Restaurant', username: 'myrestaurant' },
      { id: '789012', name: 'Café Praha', username: 'cafepraha' },
      { id: '345678', name: 'Test Page', username: null },
      { id: '901234', name: 'Czech Příšerně Žluťoučký', username: 'czechpage' },
    ]

    it('matches by exact page ID', () => {
      const result = matchPageByIdentifier(testPages, '123456')
      expect(result?.id).toBe('123456')
    })

    it('matches by username (case-insensitive)', () => {
      const result = matchPageByIdentifier(testPages, 'MYRESTAURANT')
      expect(result?.id).toBe('123456')
    })

    it('matches by exact name (case-insensitive)', () => {
      const result = matchPageByIdentifier(testPages, 'test page')
      expect(result?.id).toBe('345678')
    })

    it('matches by name with diacritics normalization', () => {
      const result = matchPageByIdentifier(testPages, 'cafe praha')
      expect(result?.id).toBe('789012')
    })

    it('matches by partial name', () => {
      const result = matchPageByIdentifier(testPages, 'Restaurant')
      expect(result?.id).toBe('123456')
    })

    it('returns null when no match found', () => {
      const result = matchPageByIdentifier(testPages, 'NonexistentPage')
      expect(result).toBeNull()
    })

    it('prioritizes exact ID match over username', () => {
      const pages = [
        { id: 'testpage', name: 'Other Page', username: null },
        { id: '999', name: 'Test', username: 'testpage' },
      ]
      const result = matchPageByIdentifier(pages, 'testpage')
      expect(result?.id).toBe('testpage')
    })

    it('handles pages without username', () => {
      const result = matchPageByIdentifier(testPages, 'Test Page')
      expect(result?.id).toBe('345678')
    })

    it('handles empty pages array', () => {
      const result = matchPageByIdentifier([], 'anything')
      expect(result).toBeNull()
    })

    it('handles Czech diacritics in search', () => {
      const result = matchPageByIdentifier(testPages, 'priserne zlutoucky')
      expect(result?.id).toBe('901234')
    })

    it('matches partial name even with empty result for empty identifier', () => {
      // Empty identifier still goes through the matching logic
      // and won't find any match because normalizeForComparison('')
      // produces empty string which is included in all normalized names
      const result = matchPageByIdentifier(testPages, '')
      // The current implementation will match first page because '' is included in any string
      expect(result).not.toBeNull()
    })

    it('matches first page for whitespace-only identifier after normalization', () => {
      // Whitespace normalizes to empty string
      const result = matchPageByIdentifier(testPages, '   ')
      // Same behavior as empty string
      expect(result).not.toBeNull()
    })
  })

  describe('edge cases', () => {
    it('returns null for URL-encoded characters (not alphanumeric)', () => {
      // URL-encoded space (%20) contains % which is not alphanumeric
      const result = parseFacebookUrl('https://facebook.com/my%20page')
      expect(result).toBeNull()
    })

    it('handles multiple query parameters', () => {
      const result = parseFacebookUrl('https://facebook.com/MyPage?ref=home&sort=asc&lang=cs')
      expect(result?.value).toBe('MyPage')
    })

    it('handles numeric-like usernames (starting with number)', () => {
      const result = parseFacebookUrl('https://facebook.com/123abc456')
      // Alphanumeric that starts with digits should still be treated as username
      // since it contains non-numeric characters
      expect(result?.type).toBe('username')
      expect(result?.value).toBe('123abc456')
    })

    it('handles hash fragments in URL', () => {
      const result = parseFacebookUrl('https://facebook.com/MyPage#section')
      expect(result?.value).toBe('MyPage')
    })

    it('handles both query params and hash fragments', () => {
      const result = parseFacebookUrl('https://facebook.com/MyPage?ref=home#about')
      expect(result?.value).toBe('MyPage')
    })

    it('handles username with numbers', () => {
      const result = parseFacebookUrl('https://facebook.com/page123name')
      expect(result?.type).toBe('username')
      expect(result?.value).toBe('page123name')
    })

    it('returns null for hyphenated username (not in allowed characters)', () => {
      // Hyphens are not in the regex pattern /^[a-zA-Z0-9.]+$/
      const result = parseFacebookUrl('https://facebook.com/my-page-name')
      expect(result).toBeNull()
    })

    it('returns null for underscored username (not in allowed characters)', () => {
      // Underscores are not in the regex pattern /^[a-zA-Z0-9.]+$/
      const result = parseFacebookUrl('https://facebook.com/my_page_name')
      expect(result).toBeNull()
    })

    it('handles username with dots', () => {
      // Dots ARE allowed in the regex pattern
      const result = parseFacebookUrl('https://facebook.com/my.page.name')
      expect(result?.type).toBe('username')
      expect(result?.value).toBe('my.page.name')
    })
  })
})
