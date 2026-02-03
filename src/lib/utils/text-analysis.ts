/**
 * Text analysis utilities for content classification
 * Used by CONTENT triggers to categorize posts
 */

import type { PostClassification } from '@/lib/triggers/debug-types'

export type ContentType = 'SALES' | 'BRAND' | 'ENGAGEMENT'

// Sales-oriented keywords (Czech and English)
const SALES_KEYWORDS = [
  // Czech
  'koupit',
  'kup',
  'kupte',
  'objednat',
  'objednej',
  'objednejte',
  'sleva',
  'slevy',
  'akce',
  'výprodej',
  'zlevněno',
  'cena',
  'ceny',
  'kč',
  'czk',
  'eur',
  '€',
  'doprava zdarma',
  'zdarma',
  'dárek',
  'pouze dnes',
  'limitovaná',
  'poslední kusy',
  'skladem',
  'e-shop',
  'eshop',
  'obchod',
  'shop',
  'nakupte',
  'nakup',
  'objednávka',
  'soutěž',
  'vyhrajte',
  'výhra',
  'promo',
  'promo kód',
  'slevový kód',
  'kupon',
  // English
  'buy',
  'order',
  'sale',
  'discount',
  'price',
  'shop now',
  'free shipping',
  'limited offer',
  'deal',
  'offer',
  '%',
  '% off',
  'save',
]

// Brand-building keywords (Czech and English)
const BRAND_KEYWORDS = [
  // Czech
  'firma',
  'společnost',
  'náš tým',
  'naše firma',
  'hodnoty',
  'mise',
  'vize',
  'poslání',
  'zákulisí',
  'behind the scenes',
  'bts',
  'představujeme',
  'seznamte se',
  'poznávejte',
  'historie',
  'příběh',
  'story',
  'zaměstnanci',
  'kolega',
  'kolegové',
  'tým',
  'kancelář',
  'pracoviště',
  'výroba',
  'děkujeme',
  'gratulujeme',
  'oslavujeme',
  'výročí',
  'narozeniny',
  'jubileum',
  'ocenění',
  'certifikát',
  'úspěch',
  'spolupráce',
  'partnerství',
  'partner',
  // English
  'team',
  'company',
  'values',
  'mission',
  'vision',
  'behind the scenes',
  'meet the team',
  'our story',
  'anniversary',
  'celebrate',
  'thank you',
  'award',
  'achievement',
  'milestone',
]

/**
 * Normalize text for keyword matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s%€]/g, ' ') // Keep only words, spaces, and currency symbols
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Count keyword matches for scoring
 */
function countKeywordMatches(text: string, keywords: string[]): number {
  const normalized = normalizeText(text)
  return keywords.filter((keyword) => {
    const normalizedKeyword = normalizeText(keyword)
    // Use word boundary matching for short keywords
    if (normalizedKeyword.length <= 3) {
      const regex = new RegExp(`\\b${normalizedKeyword}\\b`, 'i')
      return regex.test(normalized)
    }
    return normalized.includes(normalizedKeyword)
  }).length
}

/**
 * Find matched keywords and return them (for debug visualization)
 */
function findMatchedKeywords(text: string, keywords: string[]): string[] {
  const normalized = normalizeText(text)
  return keywords.filter((keyword) => {
    const normalizedKeyword = normalizeText(keyword)
    // Use word boundary matching for short keywords
    if (normalizedKeyword.length <= 3) {
      const regex = new RegExp(`\\b${normalizedKeyword}\\b`, 'i')
      return regex.test(normalized)
    }
    return normalized.includes(normalizedKeyword)
  })
}

/**
 * Classify a post's content type based on its text
 */
export function classifyContent(text: string | null): ContentType {
  if (!text || text.trim().length === 0) {
    return 'ENGAGEMENT' // Default for posts without text
  }

  const salesMatches = countKeywordMatches(text, SALES_KEYWORDS)
  const brandMatches = countKeywordMatches(text, BRAND_KEYWORDS)

  // Strong sales indicators
  if (salesMatches >= 2 || (salesMatches >= 1 && text.includes('%'))) {
    return 'SALES'
  }

  // Strong brand indicators
  if (brandMatches >= 2) {
    return 'BRAND'
  }

  // Single match with additional context
  if (salesMatches === 1 && brandMatches === 0) {
    return 'SALES'
  }

  if (brandMatches === 1 && salesMatches === 0) {
    return 'BRAND'
  }

  // Engagement patterns or default
  return 'ENGAGEMENT'
}

/**
 * Analyze content mix for a collection of posts
 */
export interface ContentMixAnalysis {
  salesCount: number
  brandCount: number
  engagementCount: number
  salesPct: number
  brandPct: number
  engagementPct: number
  total: number
}

export function analyzeContentMix(posts: Array<{ message: string | null }>): ContentMixAnalysis {
  let salesCount = 0
  let brandCount = 0
  let engagementCount = 0

  for (const post of posts) {
    const type = classifyContent(post.message)
    switch (type) {
      case 'SALES':
        salesCount++
        break
      case 'BRAND':
        brandCount++
        break
      case 'ENGAGEMENT':
        engagementCount++
        break
    }
  }

  const total = posts.length
  const pct = (count: number) => (total > 0 ? (count / total) * 100 : 0)

  return {
    salesCount,
    brandCount,
    engagementCount,
    salesPct: pct(salesCount),
    brandPct: pct(brandCount),
    engagementPct: pct(engagementCount),
    total,
  }
}

/**
 * Classify content and return debug information about matched keywords
 * Handles edge cases: null text, empty text, non-Czech languages
 */
export function classifyContentWithDebug(text: string | null): {
  classification: ContentType
  salesMatches: string[]
  brandMatches: string[]
  reasoning: string
} {
  // EDGE CASE: No text
  if (!text || text.trim().length === 0) {
    return {
      classification: 'ENGAGEMENT',
      salesMatches: [],
      brandMatches: [],
      reasoning: 'Žádný text k analýze → výchozí ENGAGEMENT',
    }
  }

  // Find matched keywords
  const salesMatches = findMatchedKeywords(text, SALES_KEYWORDS)
  const brandMatches = findMatchedKeywords(text, BRAND_KEYWORDS)

  const hasPercentSymbol = text.includes('%')

  // EDGE CASE: Truncate if too many matches (>20)
  const truncatedSales = salesMatches.slice(0, 20)
  const truncatedBrand = brandMatches.slice(0, 20)

  // Determine classification with reasoning
  let classification: ContentType
  let reasoning: string

  if (salesMatches.length >= 2 || (salesMatches.length >= 1 && hasPercentSymbol)) {
    classification = 'SALES'
    reasoning = hasPercentSymbol
      ? `${salesMatches.length} prodejní${salesMatches.length > 1 ? 'ch' : ''} klíčov${salesMatches.length > 1 ? 'ých slov' : 'é slovo'} + % symbol → SALES`
      : `${salesMatches.length} prodejních klíčových slov → SALES`
  } else if (brandMatches.length >= 2) {
    classification = 'BRAND'
    reasoning = `${brandMatches.length} brandových klíčových slov → BRAND`
  } else if (salesMatches.length === 1 && brandMatches.length === 0) {
    classification = 'SALES'
    reasoning = '1 prodejní klíčové slovo, 0 brandových → SALES'
  } else if (brandMatches.length === 1 && salesMatches.length === 0) {
    classification = 'BRAND'
    reasoning = '1 brandové klíčové slovo, 0 prodejních → BRAND'
  } else {
    classification = 'ENGAGEMENT'
    reasoning =
      salesMatches.length === 0 && brandMatches.length === 0
        ? 'Žádná klíčová slova nenalezena → ENGAGEMENT'
        : `${salesMatches.length} prodejní, ${brandMatches.length} brandové → ENGAGEMENT (nedostatečné množství)`
  }

  return {
    classification,
    salesMatches: truncatedSales,
    brandMatches: truncatedBrand,
    reasoning,
  }
}

/**
 * Analyze content mix with debug information for sample posts
 */
export function analyzeContentMixWithDebug(posts: Array<{ id: string; message: string | null }>): {
  analysis: ContentMixAnalysis
  postClassifications: PostClassification[]
} {
  const analysis = analyzeContentMix(posts) // Use existing function for counts

  // Get debug info for first 20 posts only (performance)
  const sampleSize = Math.min(posts.length, 20)
  const postClassifications: PostClassification[] = posts.slice(0, sampleSize).map((post) => {
    const { classification, salesMatches, brandMatches, reasoning } = classifyContentWithDebug(
      post.message
    )

    return {
      postId: post.id,
      classification,
      matchedKeywords: {
        sales: salesMatches,
        brand: brandMatches,
      },
      reasoning,
    }
  })

  return { analysis, postClassifications }
}

/**
 * Check if a post has strong call-to-action
 */
export function hasCallToAction(text: string | null): boolean {
  if (!text) return false

  const ctaPatterns = [
    /klikn(ěte|i|ete)/i,
    /přejd(ěte|i)/i,
    /navštiv(te)?/i,
    /více (info|informací|na|v)/i,
    /odkaz v (bio|profilu)/i,
    /link in bio/i,
    /click (here|the link)/i,
    /learn more/i,
    /read more/i,
    /shop now/i,
    /sign up/i,
    /register/i,
    /download/i,
    /stáhn(ěte|i)/i,
    /zaregistruj/i,
  ]

  return ctaPatterns.some((pattern) => pattern.test(text))
}
