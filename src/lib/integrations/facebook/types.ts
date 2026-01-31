// Facebook Graph API Types

export interface FacebookError {
  message: string
  type: string
  code: number
  error_subcode?: number
  fbtrace_id?: string
}

export interface FacebookErrorResponse {
  error: FacebookError
}

export interface FacebookPaging {
  cursors?: {
    before?: string
    after?: string
  }
  next?: string
  previous?: string
}

export interface FacebookPicture {
  data: {
    height: number
    width: number
    url: string
    is_silhouette: boolean
  }
}

export interface FacebookCover {
  cover_id: string
  source: string
  offset_x: number
  offset_y: number
}

export interface FacebookPageBasic {
  id: string
  name: string
  access_token: string
  category?: string
  category_list?: Array<{
    id: string
    name: string
  }>
  tasks?: string[]
}

export interface FacebookPage extends FacebookPageBasic {
  fan_count?: number
  picture?: FacebookPicture
  cover?: FacebookCover
  about?: string
  website?: string
  link?: string
  username?: string
}

export interface FacebookMeAccountsResponse {
  data: FacebookPageBasic[]
  paging?: FacebookPaging
}

export type FacebookPageMetadataResponse = FacebookPage

// Normalized types for internal use
export interface NormalizedFacebookPage {
  fb_page_id: string
  name: string
  category: string | null
  fan_count: number | null
  picture_url: string | null
  cover_url: string | null
  page_access_token: string
  username: string | null
}

export interface PageListItem {
  id: string
  name: string
  category: string | null
  picture_url: string | null
  tasks: string[]
}

// Business Portfolio Types
export interface FacebookBusiness {
  id: string
  name: string
}

export interface FacebookBusinessesResponse {
  data: FacebookBusiness[]
  paging?: FacebookPaging
}

// owned_pages response has the same format as /me/accounts
export type FacebookBusinessOwnedPagesResponse = FacebookMeAccountsResponse

// Feed Types
export interface FacebookAttachmentMedia {
  image?: {
    height: number
    width: number
    src: string
  }
  source?: string // Video URL
}

export interface FacebookAttachment {
  media?: FacebookAttachmentMedia
  media_type?: string // photo, video, link, etc.
  type?: string
  url?: string
  title?: string
  description?: string
  target?: {
    id: string
    url: string
  }
  subattachments?: {
    data: FacebookAttachment[]
  }
}

export interface FacebookReactionsSummary {
  total_count: number
  viewer_reaction?: string
}

export interface FacebookCommentsSummary {
  total_count: number
  can_comment?: boolean
}

export interface FacebookShares {
  count: number
}

export interface FacebookPost {
  id: string
  created_time: string
  message?: string
  story?: string
  type?: string // link, status, photo, video, offer
  status_type?: string
  permalink_url?: string
  full_picture?: string
  attachments?: {
    data: FacebookAttachment[]
  }
  reactions?: {
    summary: FacebookReactionsSummary
  }
  comments?: {
    summary: FacebookCommentsSummary
  }
  shares?: FacebookShares
  is_published?: boolean
  is_hidden?: boolean
  // Insights (if available)
  insights?: {
    data: Array<{
      name: string
      period: string
      values: Array<{
        value: number | Record<string, number>
      }>
    }>
  }
}

export interface FacebookFeedResponse {
  data: FacebookPost[]
  paging?: FacebookPaging
}

// Insights Types
export interface FacebookInsightValue {
  value: number | Record<string, number>
  end_time?: string
}

export interface FacebookInsight {
  name: string
  period: string
  values: FacebookInsightValue[]
  title?: string
  description?: string
  id: string
}

export interface FacebookInsightsResponse {
  data: FacebookInsight[]
  paging?: FacebookPaging
}

// Post insights
export interface FacebookPostInsight {
  name: string
  period: string
  values: Array<{
    value: number | Record<string, number>
  }>
}

export interface FacebookPostWithInsights extends FacebookPost {
  insights?: {
    data: FacebookPostInsight[]
  }
}
