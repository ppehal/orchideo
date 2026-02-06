/**
 * Competitor Groups Authorization tests - AUTHZ Critical.
 *
 * SECURITY CRITICAL: Tests authorization boundaries (user can only access
 * own resources), transaction atomicity, and validation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  deleteCompetitorGroupAction,
  createCompetitorGroupAction,
} from '@/lib/actions/competitor-groups'
import { mockSession } from '../../utils/test-helpers'

// Mock functions - declared outside to avoid hoisting issues
const mockAuth = vi.fn()
const mockRevalidatePath = vi.fn()

const mockCompetitorGroupFindUnique = vi.fn()
const mockCompetitorGroupDelete = vi.fn()
const mockCompetitorGroupCreate = vi.fn()
const mockCompetitorPageCreateMany = vi.fn()
const mockFacebookPageFindMany = vi.fn()
const mockPrismaTransaction = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    competitorGroup: {
      findUnique: (...args: unknown[]) => mockCompetitorGroupFindUnique(...args),
      delete: (...args: unknown[]) => mockCompetitorGroupDelete(...args),
      create: (...args: unknown[]) => mockCompetitorGroupCreate(...args),
    },
    competitorPage: {
      createMany: (...args: unknown[]) => mockCompetitorPageCreateMany(...args),
    },
    facebookPage: {
      findMany: (...args: unknown[]) => mockFacebookPageFindMany(...args),
    },
    $transaction: (callback: unknown) => mockPrismaTransaction(callback),
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}))

describe('deleteCompetitorGroupAction', () => {
  const TEST_USER_ID = 'user-1'
  const TEST_GROUP_ID = 'group-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('authentication', () => {
    it('returns UNAUTHORIZED when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const result = await deleteCompetitorGroupAction(TEST_GROUP_ID)

      expect(result).toEqual({
        success: false,
        error: 'Nepřihlášen',
        code: 'UNAUTHORIZED',
      })
      expect(mockCompetitorGroupFindUnique).not.toHaveBeenCalled()
    })
  })

  describe('authorization', () => {
    it('returns NOT_FOUND when group missing', async () => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
      mockCompetitorGroupFindUnique.mockResolvedValue(null)

      const result = await deleteCompetitorGroupAction(TEST_GROUP_ID)

      expect(result).toEqual({
        success: false,
        error: 'Skupina nebyla nalezena',
        code: 'NOT_FOUND',
      })
      expect(mockCompetitorGroupDelete).not.toHaveBeenCalled()
    })

    it('returns FORBIDDEN when group belongs to another user', async () => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
      mockCompetitorGroupFindUnique.mockResolvedValue({
        id: TEST_GROUP_ID,
        userId: 'different-user-id', // Different user!
      })

      const result = await deleteCompetitorGroupAction(TEST_GROUP_ID)

      expect(result).toEqual({
        success: false,
        error: 'Nemáte oprávnění smazat tuto skupinu',
        code: 'FORBIDDEN',
      })
      expect(mockCompetitorGroupDelete).not.toHaveBeenCalled()
    })

    it('allows delete when user owns group', async () => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
      mockCompetitorGroupFindUnique.mockResolvedValue({
        id: TEST_GROUP_ID,
        userId: TEST_USER_ID, // Same user
      })
      mockCompetitorGroupDelete.mockResolvedValue({
        id: TEST_GROUP_ID,
      })

      const result = await deleteCompetitorGroupAction(TEST_GROUP_ID)

      expect(result).toEqual({
        success: true,
      })
      expect(mockCompetitorGroupDelete).toHaveBeenCalledWith({
        where: { id: TEST_GROUP_ID },
      })
    })
  })

  describe('cascade delete', () => {
    it('deletes group (cascade will delete competitors)', async () => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
      mockCompetitorGroupFindUnique.mockResolvedValue({
        id: TEST_GROUP_ID,
        userId: TEST_USER_ID,
      })
      mockCompetitorGroupDelete.mockResolvedValue({
        id: TEST_GROUP_ID,
      })

      await deleteCompetitorGroupAction(TEST_GROUP_ID)

      // Verify only group delete is called (cascade handles rest)
      expect(mockCompetitorGroupDelete).toHaveBeenCalledWith({
        where: { id: TEST_GROUP_ID },
      })
    })
  })

  describe('cache invalidation', () => {
    it('revalidates /competitors page after deletion', async () => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
      mockCompetitorGroupFindUnique.mockResolvedValue({
        id: TEST_GROUP_ID,
        userId: TEST_USER_ID,
      })
      mockCompetitorGroupDelete.mockResolvedValue({
        id: TEST_GROUP_ID,
      })

      await deleteCompetitorGroupAction(TEST_GROUP_ID)

      expect(mockRevalidatePath).toHaveBeenCalledWith('/competitors')
    })
  })

  describe('error handling', () => {
    it('returns INTERNAL_ERROR on unexpected errors', async () => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
      mockCompetitorGroupFindUnique.mockRejectedValue(
        new Error('Database connection failed')
      )

      const result = await deleteCompetitorGroupAction(TEST_GROUP_ID)

      expect(result).toEqual({
        success: false,
        error: 'Neočekávaná chyba při mazání skupiny',
        code: 'INTERNAL_ERROR',
      })
    })
  })
})

describe('createCompetitorGroupAction', () => {
  const TEST_USER_ID = 'user-1'
  const TEST_PRIMARY_PAGE_ID = 'fb-page-1'
  const TEST_COMPETITOR_1_ID = 'fb-page-2'
  const TEST_COMPETITOR_2_ID = 'fb-page-3'

  function createFormData(data: Record<string, string | boolean>): FormData {
    const formData = new FormData()

    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        if (value) formData.append(key, 'on')
      } else {
        formData.append(key, value)
      }
    })

    return formData
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('authentication', () => {
    it('returns UNAUTHORIZED when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      const formData = createFormData({
        name: 'Test Group',
        primaryPageId: TEST_PRIMARY_PAGE_ID,
        competitor_fb_page_2: true,
      })

      const result = await createCompetitorGroupAction(null, formData)

      expect(result).toEqual({
        success: false,
        error: 'Nepřihlášen',
        code: 'UNAUTHORIZED',
      })
    })
  })

  describe('validation', () => {
    beforeEach(() => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
    })

    it('validates name is required', async () => {
      const formData = createFormData({
        name: '', // Empty name
        primaryPageId: TEST_PRIMARY_PAGE_ID,
        competitor_fb_page_2: true,
      })

      const result = await createCompetitorGroupAction(null, formData)

      expect(result).toEqual({
        success: false,
        error: 'Název je povinný',
        code: 'VALIDATION_ERROR',
      })
    })

    it('validates primaryPageId is required', async () => {
      const formData = createFormData({
        name: 'Test Group',
        primaryPageId: '', // Empty primary page
        competitor_fb_page_2: true,
      })

      const result = await createCompetitorGroupAction(null, formData)

      expect(result).toEqual({
        success: false,
        error: 'ID primární stránky je povinné',
        code: 'VALIDATION_ERROR',
      })
    })

    it('validates at least 1 competitor is required', async () => {
      const formData = createFormData({
        name: 'Test Group',
        primaryPageId: TEST_PRIMARY_PAGE_ID,
        // No competitors selected
      })

      const result = await createCompetitorGroupAction(null, formData)

      expect(result).toEqual({
        success: false,
        error: 'Alespoň jeden konkurent je vyžadován',
        code: 'VALIDATION_ERROR',
      })
    })

    it('limits to max 10 competitors', async () => {
      const formData = createFormData({
        name: 'Test Group',
        primaryPageId: TEST_PRIMARY_PAGE_ID,
        competitor_page_1: true,
        competitor_page_2: true,
        competitor_page_3: true,
        competitor_page_4: true,
        competitor_page_5: true,
        competitor_page_6: true,
        competitor_page_7: true,
        competitor_page_8: true,
        competitor_page_9: true,
        competitor_page_10: true,
        competitor_page_11: true, // 11th competitor - exceeds limit
      })

      const result = await createCompetitorGroupAction(null, formData)

      expect(result.success).toBe(false)
      expect(result.code).toBe('VALIDATION_ERROR')
    })

    it('accepts valid data', async () => {
      const formData = createFormData({
        name: 'Test Group',
        description: 'Test description',
        primaryPageId: TEST_PRIMARY_PAGE_ID,
        [`competitor_${TEST_COMPETITOR_1_ID}`]: true,
        [`competitor_${TEST_COMPETITOR_2_ID}`]: true,
      })

      mockFacebookPageFindMany.mockResolvedValue([
        { id: TEST_PRIMARY_PAGE_ID },
        { id: TEST_COMPETITOR_1_ID },
        { id: TEST_COMPETITOR_2_ID },
      ])

      mockPrismaTransaction.mockImplementation(async (callback) => {
        return callback({
          competitorGroup: {
            create: vi.fn().mockResolvedValue({ id: 'group-1' }),
          },
          competitorPage: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
        })
      })

      const result = await createCompetitorGroupAction(null, formData)

      expect(result.success).toBe(true)
    })
  })

  describe('authorization', () => {
    beforeEach(() => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
    })

    it('verifies all pages belong to user', async () => {
      const formData = createFormData({
        name: 'Test Group',
        primaryPageId: TEST_PRIMARY_PAGE_ID,
        [`competitor_${TEST_COMPETITOR_1_ID}`]: true,
      })

      mockFacebookPageFindMany.mockResolvedValue([
        { id: TEST_PRIMARY_PAGE_ID }, // Only 1 page found, missing competitor
      ])

      const result = await createCompetitorGroupAction(null, formData)

      expect(result).toEqual({
        success: false,
        error: 'Některé stránky nebyly nalezeny nebo k nim nemáte přístup',
        code: 'INVALID_PAGES',
      })

      // Verify correct query was made
      expect(mockFacebookPageFindMany).toHaveBeenCalledWith({
        where: {
          id: { in: [TEST_PRIMARY_PAGE_ID, TEST_COMPETITOR_1_ID] },
          userId: TEST_USER_ID,
        },
        select: { id: true },
      })
    })

    it('rejects if primary page not owned', async () => {
      const formData = createFormData({
        name: 'Test Group',
        primaryPageId: TEST_PRIMARY_PAGE_ID,
        [`competitor_${TEST_COMPETITOR_1_ID}`]: true,
      })

      // Return only competitor, not primary page (not owned)
      mockFacebookPageFindMany.mockResolvedValue([{ id: TEST_COMPETITOR_1_ID }])

      const result = await createCompetitorGroupAction(null, formData)

      expect(result).toEqual({
        success: false,
        error: 'Některé stránky nebyly nalezeny nebo k nim nemáte přístup',
        code: 'INVALID_PAGES',
      })
    })

    it('rejects if competitor page not owned', async () => {
      const formData = createFormData({
        name: 'Test Group',
        primaryPageId: TEST_PRIMARY_PAGE_ID,
        [`competitor_${TEST_COMPETITOR_1_ID}`]: true,
      })

      // Return only primary page, not competitor (not owned)
      mockFacebookPageFindMany.mockResolvedValue([{ id: TEST_PRIMARY_PAGE_ID }])

      const result = await createCompetitorGroupAction(null, formData)

      expect(result).toEqual({
        success: false,
        error: 'Některé stránky nebyly nalezeny nebo k nim nemáte přístup',
        code: 'INVALID_PAGES',
      })
    })
  })

  describe('duplicate detection', () => {
    beforeEach(() => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
    })

    it('rejects primary page as competitor', async () => {
      const formData = createFormData({
        name: 'Test Group',
        primaryPageId: TEST_PRIMARY_PAGE_ID,
        [`competitor_${TEST_PRIMARY_PAGE_ID}`]: true, // Primary page as competitor!
        [`competitor_${TEST_COMPETITOR_1_ID}`]: true,
      })

      // allPageIds will be [PRIMARY, PRIMARY, COMPETITOR_1] due to duplicate
      // Database returns unique pages only, so pages.length (2) !== allPageIds.length (3)
      // This triggers INVALID_PAGES before DUPLICATE_PAGE check
      mockFacebookPageFindMany.mockResolvedValue([
        { id: TEST_PRIMARY_PAGE_ID },
        { id: TEST_COMPETITOR_1_ID },
      ])

      const result = await createCompetitorGroupAction(null, formData)

      // Current implementation returns INVALID_PAGES due to count mismatch
      // (This is a quirk where the duplicate check happens after the count check)
      expect(result).toEqual({
        success: false,
        error: 'Některé stránky nebyly nalezeny nebo k nim nemáte přístup',
        code: 'INVALID_PAGES',
      })
    })

    it('deduplicates competitor IDs', async () => {
      const formData = createFormData({
        name: 'Test Group',
        primaryPageId: TEST_PRIMARY_PAGE_ID,
        [`competitor_${TEST_COMPETITOR_1_ID}`]: true,
      })

      // Manually add duplicate competitor ID to form data
      formData.append(`competitor_${TEST_COMPETITOR_1_ID}`, 'on')

      mockFacebookPageFindMany.mockResolvedValue([
        { id: TEST_PRIMARY_PAGE_ID },
        { id: TEST_COMPETITOR_1_ID },
      ])

      const mockCreate = vi.fn().mockResolvedValue({ id: 'group-1' })
      const mockCreateMany = vi.fn().mockResolvedValue({ count: 1 })

      mockPrismaTransaction.mockImplementation(async (callback) => {
        return callback({
          competitorGroup: { create: mockCreate },
          competitorPage: { createMany: mockCreateMany },
        })
      })

      await createCompetitorGroupAction(null, formData)

      // Verify only 1 competitor page created (deduplicated)
      expect(mockCreateMany).toHaveBeenCalledWith({
        data: [
          {
            group_id: 'group-1',
            fb_page_id: TEST_COMPETITOR_1_ID,
          },
        ],
      })
    })
  })

  describe('transaction', () => {
    beforeEach(() => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
    })

    it('creates group + competitors atomically', async () => {
      const formData = createFormData({
        name: 'Test Group',
        description: 'Test description',
        primaryPageId: TEST_PRIMARY_PAGE_ID,
        [`competitor_${TEST_COMPETITOR_1_ID}`]: true,
        [`competitor_${TEST_COMPETITOR_2_ID}`]: true,
      })

      mockFacebookPageFindMany.mockResolvedValue([
        { id: TEST_PRIMARY_PAGE_ID },
        { id: TEST_COMPETITOR_1_ID },
        { id: TEST_COMPETITOR_2_ID },
      ])

      const mockCreate = vi.fn().mockResolvedValue({
        id: 'group-1',
        name: 'Test Group',
        description: 'Test description',
        userId: TEST_USER_ID,
        primary_page_id: TEST_PRIMARY_PAGE_ID,
      })

      const mockCreateMany = vi.fn().mockResolvedValue({ count: 2 })

      mockPrismaTransaction.mockImplementation(async (callback) => {
        return callback({
          competitorGroup: { create: mockCreate },
          competitorPage: { createMany: mockCreateMany },
        })
      })

      const result = await createCompetitorGroupAction(null, formData)

      expect(result).toEqual({
        success: true,
        data: { id: 'group-1' },
      })

      // Verify group created with correct data
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: 'Test Group',
          description: 'Test description',
          userId: TEST_USER_ID,
          primary_page_id: TEST_PRIMARY_PAGE_ID,
        },
      })

      // Verify competitors created
      expect(mockCreateMany).toHaveBeenCalledWith({
        data: [
          { group_id: 'group-1', fb_page_id: TEST_COMPETITOR_1_ID },
          { group_id: 'group-1', fb_page_id: TEST_COMPETITOR_2_ID },
        ],
      })
    })

    it('omits description when not provided', async () => {
      const formData = createFormData({
        name: 'Test Group',
        // No description
        primaryPageId: TEST_PRIMARY_PAGE_ID,
        [`competitor_${TEST_COMPETITOR_1_ID}`]: true,
      })

      mockFacebookPageFindMany.mockResolvedValue([
        { id: TEST_PRIMARY_PAGE_ID },
        { id: TEST_COMPETITOR_1_ID },
      ])

      const mockCreate = vi.fn().mockResolvedValue({ id: 'group-1' })
      const mockCreateMany = vi.fn().mockResolvedValue({ count: 1 })

      mockPrismaTransaction.mockImplementation(async (callback) => {
        return callback({
          competitorGroup: { create: mockCreate },
          competitorPage: { createMany: mockCreateMany },
        })
      })

      await createCompetitorGroupAction(null, formData)

      // Verify no description in create data
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: 'Test Group',
          userId: TEST_USER_ID,
          primary_page_id: TEST_PRIMARY_PAGE_ID,
        },
      })
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
    })

    it('returns INTERNAL_ERROR on unexpected errors', async () => {
      const formData = createFormData({
        name: 'Test Group',
        primaryPageId: TEST_PRIMARY_PAGE_ID,
        [`competitor_${TEST_COMPETITOR_1_ID}`]: true,
      })

      mockFacebookPageFindMany.mockRejectedValue(
        new Error('Database connection failed')
      )

      const result = await createCompetitorGroupAction(null, formData)

      expect(result).toEqual({
        success: false,
        error: 'Neočekávaná chyba při vytváření skupiny',
        code: 'INTERNAL_ERROR',
      })
    })
  })
})
