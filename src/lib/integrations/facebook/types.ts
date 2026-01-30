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
