'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createLogger, logError, LogFields } from '@/lib/logging'
import { success, failure, type ActionResult } from './action-wrapper'

const log = createLogger('action-competitor-groups')

// Validation schema for form data
const createGroupSchema = z.object({
  name: z.string().min(1, 'Název je povinný').max(100),
  description: z.string().max(500).optional(),
  primaryPageId: z.string().min(1, 'ID primární stránky je povinné'),
  competitorPageIds: z.array(z.string()).min(1, 'Alespoň jeden konkurent je vyžadován').max(10),
})

export interface CreateGroupResult {
  id: string
}

export type CreateGroupFormState = ActionResult<CreateGroupResult>

/**
 * Server Action for deleting a competitor group.
 *
 * @param groupId - ID of the group to delete
 * @returns ActionResult with success/error
 */
export async function deleteCompetitorGroupAction(groupId: string): Promise<ActionResult> {
  let userId: string | undefined

  try {
    // Check authentication
    const session = await auth()

    if (!session?.user?.id) {
      return failure('Nepřihlášen', 'UNAUTHORIZED')
    }

    userId = session.user.id

    // Verify group belongs to user
    const group = await prisma.competitorGroup.findUnique({
      where: { id: groupId },
      select: { userId: true },
    })

    if (!group) {
      return failure('Skupina nebyla nalezena', 'NOT_FOUND')
    }

    if (group.userId !== userId) {
      return failure('Nemáte oprávnění smazat tuto skupinu', 'FORBIDDEN')
    }

    // Delete group (cascade will delete related competitors and comparisons)
    await prisma.competitorGroup.delete({
      where: { id: groupId },
    })

    log.info({ groupId, userId }, 'Competitor group deleted')

    // Revalidate the competitors page to show updated list
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/competitors')

    return success()
  } catch (error) {
    logError(log, error, 'Failed to delete competitor group', {
      [LogFields.userId]: userId,
      group_id: groupId,
    })

    return failure('Neočekávaná chyba při mazání skupiny', 'INTERNAL_ERROR')
  }
}

/**
 * Server Action for creating competitor group from form submission.
 * Compatible with React 19's useActionState hook.
 *
 * @param _prevState - Previous state (unused, required by useActionState)
 * @param formData - Form data from the form submission
 * @returns ActionResult with group ID or error
 */
export async function createCompetitorGroupAction(
  _prevState: CreateGroupFormState | null,
  formData: FormData
): Promise<CreateGroupFormState> {
  let userId: string | undefined

  try {
    // Check authentication
    const session = await auth()

    if (!session?.user?.id) {
      return failure('Nepřihlášen', 'UNAUTHORIZED')
    }

    userId = session.user.id

    // Extract and parse form data (null-safe)
    const name = (formData.get('name') as string | null) || ''
    const description = (formData.get('description') as string | null) || ''
    const primaryPageId = (formData.get('primaryPageId') as string | null) || ''

    // Parse competitor IDs from multiple form fields
    const competitorPageIds: string[] = []
    formData.forEach((value, key) => {
      if (key.startsWith('competitor_') && value === 'on') {
        const pageId = key.replace('competitor_', '')
        competitorPageIds.push(pageId)
      }
    })

    // Validate data
    const parsed = createGroupSchema.safeParse({
      name,
      description: description || undefined,
      primaryPageId,
      competitorPageIds,
    })

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return failure(firstError?.message || 'Neplatná data', 'VALIDATION_ERROR')
    }

    const { competitorPageIds: rawCompetitorPageIds } = parsed.data

    // Deduplicate competitor page IDs
    const uniqueCompetitorPageIds = [...new Set(rawCompetitorPageIds)]

    // Verify all pages belong to user
    const allPageIds = [primaryPageId, ...uniqueCompetitorPageIds]
    const pages = await prisma.facebookPage.findMany({
      where: {
        id: { in: allPageIds },
        userId,
      },
      select: { id: true },
    })

    if (pages.length !== allPageIds.length) {
      return failure('Některé stránky nebyly nalezeny nebo k nim nemáte přístup', 'INVALID_PAGES')
    }

    // Check for duplicate page in competitors
    if (uniqueCompetitorPageIds.includes(primaryPageId)) {
      return failure('Primární stránka nemůže být zároveň konkurentem', 'DUPLICATE_PAGE')
    }

    // Create group with competitors in a transaction
    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.competitorGroup.create({
        data: {
          name,
          ...(description ? { description } : {}),
          userId: userId!, // Guaranteed by auth check above
          primary_page_id: primaryPageId,
        },
      })

      await tx.competitorPage.createMany({
        data: uniqueCompetitorPageIds.map((pageId) => ({
          group_id: newGroup.id,
          fb_page_id: pageId,
        })),
      })

      return newGroup
    })

    log.info({ groupId: group.id, userId }, 'Competitor group created')

    return success({ id: group.id })
  } catch (error) {
    logError(log, error, 'Failed to create competitor group', {
      [LogFields.userId]: userId,
    })

    return failure('Neočekávaná chyba při vytváření skupiny', 'INTERNAL_ERROR')
  }
}
