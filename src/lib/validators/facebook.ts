import { z } from 'zod'

// ============================================================================
// Common schemas
// ============================================================================

export const FacebookPagingSchema = z.object({
  cursors: z
    .object({
      before: z.string().optional(),
      after: z.string().optional(),
    })
    .optional(),
  next: z.string().optional(),
  previous: z.string().optional(),
})

export const FacebookErrorSchema = z.object({
  message: z.string(),
  type: z.string(),
  code: z.number(),
  error_subcode: z.number().optional(),
  fbtrace_id: z.string().optional(),
})

export const FacebookErrorResponseSchema = z.object({
  error: FacebookErrorSchema,
})

// ============================================================================
// Pages schemas
// ============================================================================

export const FacebookCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const FacebookPictureDataSchema = z.object({
  height: z.number(),
  width: z.number(),
  url: z.string(),
  is_silhouette: z.boolean(),
})

export const FacebookPictureSchema = z.object({
  data: FacebookPictureDataSchema,
})

export const FacebookCoverSchema = z.object({
  cover_id: z.string(),
  source: z.string(),
  offset_x: z.number(),
  offset_y: z.number(),
})

export const FacebookPageBasicSchema = z.object({
  id: z.string(),
  name: z.string(),
  access_token: z.string(),
  category: z.string().optional(),
  category_list: z.array(FacebookCategorySchema).optional(),
  tasks: z.array(z.string()).optional(),
})

export const FacebookPageSchema = FacebookPageBasicSchema.extend({
  fan_count: z.number().optional(),
  picture: FacebookPictureSchema.optional(),
  cover: FacebookCoverSchema.optional(),
  about: z.string().optional(),
  website: z.string().optional(),
  link: z.string().optional(),
  username: z.string().optional(),
})

export const FacebookMeAccountsResponseSchema = z.object({
  data: z.array(FacebookPageBasicSchema),
  paging: FacebookPagingSchema.optional(),
})

// ============================================================================
// Feed schemas
// ============================================================================

export const FacebookAttachmentMediaImageSchema = z.object({
  height: z.number(),
  width: z.number(),
  src: z.string(),
})

export const FacebookAttachmentMediaSchema = z.object({
  image: FacebookAttachmentMediaImageSchema.optional(),
  source: z.string().optional(),
})

export const FacebookAttachmentTargetSchema = z.object({
  id: z.string(),
  url: z.string(),
})

// Forward declaration for recursive type
export const FacebookAttachmentSchema: z.ZodType<{
  media?: { image?: { height: number; width: number; src: string }; source?: string }
  media_type?: string
  type?: string
  url?: string
  title?: string
  description?: string
  target?: { id: string; url: string }
  subattachments?: { data: unknown[] }
}> = z.lazy(() =>
  z.object({
    media: FacebookAttachmentMediaSchema.optional(),
    media_type: z.string().optional(),
    type: z.string().optional(),
    url: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    target: FacebookAttachmentTargetSchema.optional(),
    subattachments: z
      .object({
        data: z.array(FacebookAttachmentSchema),
      })
      .optional(),
  })
)

export const FacebookReactionsSummarySchema = z.object({
  total_count: z.number(),
  viewer_reaction: z.string().optional(),
})

export const FacebookCommentsSummarySchema = z.object({
  total_count: z.number(),
  can_comment: z.boolean().optional(),
})

export const FacebookSharesSchema = z.object({
  count: z.number(),
})

export const FacebookPostInsightValueSchema = z.object({
  value: z.union([z.number(), z.record(z.string(), z.number())]),
})

export const FacebookPostInsightSchema = z.object({
  name: z.string(),
  period: z.string(),
  values: z.array(FacebookPostInsightValueSchema),
})

export const FacebookPostSchema = z.object({
  id: z.string(),
  created_time: z.string(),
  message: z.string().optional(),
  story: z.string().optional(),
  type: z.string().optional(),
  status_type: z.string().optional(),
  permalink_url: z.string().optional(),
  full_picture: z.string().optional(),
  attachments: z
    .object({
      data: z.array(FacebookAttachmentSchema),
    })
    .optional(),
  reactions: z
    .object({
      summary: FacebookReactionsSummarySchema,
    })
    .optional(),
  comments: z
    .object({
      summary: FacebookCommentsSummarySchema,
    })
    .optional(),
  shares: FacebookSharesSchema.optional(),
  is_published: z.boolean().optional(),
  is_hidden: z.boolean().optional(),
  insights: z
    .object({
      data: z.array(FacebookPostInsightSchema),
    })
    .optional(),
})

export const FacebookFeedResponseSchema = z.object({
  data: z.array(FacebookPostSchema),
  paging: FacebookPagingSchema.optional(),
})

// ============================================================================
// Insights schemas
// ============================================================================

export const FacebookInsightValueSchema = z.object({
  value: z.union([z.number(), z.record(z.string(), z.number())]),
  end_time: z.string().optional(),
})

export const FacebookInsightSchema = z.object({
  name: z.string(),
  period: z.string(),
  values: z.array(FacebookInsightValueSchema),
  title: z.string().optional(),
  description: z.string().optional(),
  id: z.string(),
})

export const FacebookInsightsResponseSchema = z.object({
  data: z.array(FacebookInsightSchema),
  paging: FacebookPagingSchema.optional(),
})

// ============================================================================
// Type exports (inferred from schemas)
// ============================================================================

export type FacebookPaging = z.infer<typeof FacebookPagingSchema>
export type FacebookError = z.infer<typeof FacebookErrorSchema>
export type FacebookErrorResponse = z.infer<typeof FacebookErrorResponseSchema>
export type FacebookPageBasic = z.infer<typeof FacebookPageBasicSchema>
export type FacebookPage = z.infer<typeof FacebookPageSchema>
export type FacebookMeAccountsResponse = z.infer<typeof FacebookMeAccountsResponseSchema>
export type FacebookPost = z.infer<typeof FacebookPostSchema>
export type FacebookFeedResponse = z.infer<typeof FacebookFeedResponseSchema>
export type FacebookInsight = z.infer<typeof FacebookInsightSchema>
export type FacebookInsightsResponse = z.infer<typeof FacebookInsightsResponseSchema>

// ============================================================================
// Validation helpers
// ============================================================================

/**
 * Safely parse Facebook API response with Zod schema.
 * Returns parsed data or null if validation fails.
 */
export function safeParseFacebookResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context?: string
): T | null {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error(`[Facebook API] Invalid response${context ? ` (${context})` : ''}:`, result.error)
    return null
  }
  return result.data
}

/**
 * Check if response is a Facebook API error.
 */
export function isFacebookError(data: unknown): data is FacebookErrorResponse {
  return FacebookErrorResponseSchema.safeParse(data).success
}
