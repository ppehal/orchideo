// Mapping of Facebook page categories to industry codes
// Facebook categories are returned from the API as strings

export type IndustryCode =
  | 'FOOD_RESTAURANT'
  | 'RETAIL'
  | 'BEAUTY_FITNESS'
  | 'EDUCATION'
  | 'HEALTHCARE'
  | 'NONPROFIT'
  | 'REAL_ESTATE'
  | 'ENTERTAINMENT'
  | 'PROFESSIONAL_SERVICES'
  | 'DEFAULT'

export interface IndustryInfo {
  code: IndustryCode
  name: string
  description: string
}

// Industry definitions with Czech names
export const INDUSTRIES: Record<IndustryCode, IndustryInfo> = {
  FOOD_RESTAURANT: {
    code: 'FOOD_RESTAURANT',
    name: 'Restaurace a jídlo',
    description: 'Restaurace, kavárny, jídlo a nápoje',
  },
  RETAIL: {
    code: 'RETAIL',
    name: 'Maloobchod',
    description: 'Obchody, e-shopy, prodej zboží',
  },
  BEAUTY_FITNESS: {
    code: 'BEAUTY_FITNESS',
    name: 'Krása a fitness',
    description: 'Salony krásy, posilovny, wellness',
  },
  EDUCATION: {
    code: 'EDUCATION',
    name: 'Vzdělávání',
    description: 'Školy, kurzy, vzdělávací instituce',
  },
  HEALTHCARE: {
    code: 'HEALTHCARE',
    name: 'Zdravotnictví',
    description: 'Zdravotní péče, lékárny, wellness',
  },
  NONPROFIT: {
    code: 'NONPROFIT',
    name: 'Neziskové organizace',
    description: 'Charita, nadace, občanská sdružení',
  },
  REAL_ESTATE: {
    code: 'REAL_ESTATE',
    name: 'Reality',
    description: 'Realitní kanceláře, developeři',
  },
  ENTERTAINMENT: {
    code: 'ENTERTAINMENT',
    name: 'Zábava a média',
    description: 'Média, hudba, film, zábava',
  },
  PROFESSIONAL_SERVICES: {
    code: 'PROFESSIONAL_SERVICES',
    name: 'Profesionální služby',
    description: 'Poradenství, právní služby, účetnictví',
  },
  DEFAULT: {
    code: 'DEFAULT',
    name: 'Obecný obor',
    description: 'Obecný benchmark pro všechny obory',
  },
}

// Mapping from Facebook category strings to industry codes
// Facebook categories come from the Graph API (page.category field)
const FB_CATEGORY_MAP: Record<string, IndustryCode> = {
  // Food & Restaurant
  Restaurant: 'FOOD_RESTAURANT',
  'Restaurant/Cafe': 'FOOD_RESTAURANT',
  Cafe: 'FOOD_RESTAURANT',
  'Coffee Shop': 'FOOD_RESTAURANT',
  Bar: 'FOOD_RESTAURANT',
  Pub: 'FOOD_RESTAURANT',
  'Food & Beverage': 'FOOD_RESTAURANT',
  'Food & Beverage Company': 'FOOD_RESTAURANT',
  Bakery: 'FOOD_RESTAURANT',
  'Pizza Place': 'FOOD_RESTAURANT',
  'Fast Food Restaurant': 'FOOD_RESTAURANT',
  'Food Delivery Service': 'FOOD_RESTAURANT',
  Caterer: 'FOOD_RESTAURANT',
  'Food & Restaurant': 'FOOD_RESTAURANT',

  // Retail
  'Retail Company': 'RETAIL',
  'Shopping & Retail': 'RETAIL',
  'E-commerce Website': 'RETAIL',
  'Clothing Store': 'RETAIL',
  'Clothing (Brand)': 'RETAIL',
  'Jewelry/Watches': 'RETAIL',
  'Home Decor': 'RETAIL',
  'Furniture Store': 'RETAIL',
  Electronics: 'RETAIL',
  'Sporting Goods Store': 'RETAIL',
  'Toy Store': 'RETAIL',
  'Pet Store': 'RETAIL',
  'Gift Shop': 'RETAIL',
  'Shopping Mall': 'RETAIL',
  'Grocery Store': 'RETAIL',

  // Beauty & Fitness
  'Beauty Salon': 'BEAUTY_FITNESS',
  'Beauty, Cosmetic & Personal Care': 'BEAUTY_FITNESS',
  'Hair Salon': 'BEAUTY_FITNESS',
  'Nail Salon': 'BEAUTY_FITNESS',
  Spa: 'BEAUTY_FITNESS',
  'Gym/Physical Fitness Center': 'BEAUTY_FITNESS',
  Gym: 'BEAUTY_FITNESS',
  'Yoga Studio': 'BEAUTY_FITNESS',
  'Personal Trainer': 'BEAUTY_FITNESS',
  Fitness: 'BEAUTY_FITNESS',
  'Health/Beauty': 'BEAUTY_FITNESS',
  'Cosmetics Store': 'BEAUTY_FITNESS',
  'Tattoo & Piercing Shop': 'BEAUTY_FITNESS',
  'Massage Service': 'BEAUTY_FITNESS',

  // Education
  Education: 'EDUCATION',
  School: 'EDUCATION',
  University: 'EDUCATION',
  'College & University': 'EDUCATION',
  'Elementary School': 'EDUCATION',
  'High School': 'EDUCATION',
  Preschool: 'EDUCATION',
  'Tutoring/Education': 'EDUCATION',
  'Education Website': 'EDUCATION',
  Library: 'EDUCATION',
  'Language School': 'EDUCATION',
  'Driving School': 'EDUCATION',
  'Art School': 'EDUCATION',
  'Dance School': 'EDUCATION',
  'Music Lessons & Instruction School': 'EDUCATION',

  // Healthcare
  Healthcare: 'HEALTHCARE',
  'Medical & Health': 'HEALTHCARE',
  Doctor: 'HEALTHCARE',
  Hospital: 'HEALTHCARE',
  'Dentist & Dental Office': 'HEALTHCARE',
  'Pharmacy/Drugstore': 'HEALTHCARE',
  'Medical Center': 'HEALTHCARE',
  'Health & Wellness Website': 'HEALTHCARE',
  'Mental Health Service': 'HEALTHCARE',
  'Physical Therapist': 'HEALTHCARE',
  Chiropractor: 'HEALTHCARE',
  Veterinarian: 'HEALTHCARE',
  'Medical Equipment Supplier': 'HEALTHCARE',

  // Nonprofit
  'Non-Profit Organization': 'NONPROFIT',
  'Nonprofit Organization': 'NONPROFIT',
  'Charity Organization': 'NONPROFIT',
  'Community Organization': 'NONPROFIT',
  'Religious Organization': 'NONPROFIT',
  Church: 'NONPROFIT',
  Cause: 'NONPROFIT',
  'Social Service': 'NONPROFIT',

  // Real Estate
  'Real Estate': 'REAL_ESTATE',
  'Real Estate Agent': 'REAL_ESTATE',
  'Real Estate Company': 'REAL_ESTATE',
  'Commercial Real Estate Agency': 'REAL_ESTATE',
  'Property Management Company': 'REAL_ESTATE',
  'Apartment & Condo Building': 'REAL_ESTATE',
  'Real Estate Developer': 'REAL_ESTATE',
  'Real Estate Investment Firm': 'REAL_ESTATE',

  // Entertainment & Media
  Entertainment: 'ENTERTAINMENT',
  'Media/News Company': 'ENTERTAINMENT',
  Media: 'ENTERTAINMENT',
  'News & Media Website': 'ENTERTAINMENT',
  'TV Channel': 'ENTERTAINMENT',
  'Radio Station': 'ENTERTAINMENT',
  Magazine: 'ENTERTAINMENT',
  Newspaper: 'ENTERTAINMENT',
  'Musician/Band': 'ENTERTAINMENT',
  Music: 'ENTERTAINMENT',
  Movie: 'ENTERTAINMENT',
  'Movie Theater': 'ENTERTAINMENT',
  'Arts & Entertainment': 'ENTERTAINMENT',
  'Comedy Club': 'ENTERTAINMENT',
  'Concert Venue': 'ENTERTAINMENT',
  'Event Planner': 'ENTERTAINMENT',
  Photographer: 'ENTERTAINMENT',
  'Video Creator': 'ENTERTAINMENT',
  'Gaming Video Creator': 'ENTERTAINMENT',
  Podcast: 'ENTERTAINMENT',

  // Professional Services
  'Professional Services': 'PROFESSIONAL_SERVICES',
  'Consulting Agency': 'PROFESSIONAL_SERVICES',
  'Lawyer & Law Firm': 'PROFESSIONAL_SERVICES',
  Accountant: 'PROFESSIONAL_SERVICES',
  'Financial Service': 'PROFESSIONAL_SERVICES',
  'Insurance Company': 'PROFESSIONAL_SERVICES',
  Bank: 'PROFESSIONAL_SERVICES',
  'Marketing Agency': 'PROFESSIONAL_SERVICES',
  'Advertising Agency': 'PROFESSIONAL_SERVICES',
  'Web Designer': 'PROFESSIONAL_SERVICES',
  'IT Company': 'PROFESSIONAL_SERVICES',
  'Software Company': 'PROFESSIONAL_SERVICES',
  'Business Service': 'PROFESSIONAL_SERVICES',
  Recruiter: 'PROFESSIONAL_SERVICES',
  'Notary Public': 'PROFESSIONAL_SERVICES',
  'Translation Service': 'PROFESSIONAL_SERVICES',
  'Business Consultant': 'PROFESSIONAL_SERVICES',

  // Local Business (maps to DEFAULT)
  'Local Business': 'DEFAULT',
  Company: 'DEFAULT',
  Brand: 'DEFAULT',
  'Product/Service': 'DEFAULT',
  'Business Center': 'DEFAULT',
}

/**
 * Get industry code from Facebook category
 * @param fbCategory - Category string from Facebook API
 * @returns Industry code (defaults to 'DEFAULT' if not found)
 */
export function getIndustryFromFbCategory(fbCategory: string | null | undefined): IndustryCode {
  // CRITICAL: Trim whitespace
  if (!fbCategory?.trim()) return 'DEFAULT'

  const trimmed = fbCategory.trim()

  // Direct match
  if (FB_CATEGORY_MAP[trimmed]) {
    return FB_CATEGORY_MAP[trimmed]
  }

  // Case-insensitive search
  const normalized = trimmed.toLowerCase()
  for (const [key, value] of Object.entries(FB_CATEGORY_MAP)) {
    if (key.toLowerCase() === normalized) {
      return value
    }
  }

  // Partial match (contains)
  for (const [key, value] of Object.entries(FB_CATEGORY_MAP)) {
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return value
    }
  }

  return 'DEFAULT'
}

/**
 * Get industry info by code
 */
export function getIndustryInfo(code: IndustryCode): IndustryInfo {
  return INDUSTRIES[code]
}

/**
 * Get all industries as options for selector
 */
export function getIndustryOptions(): Array<{ value: IndustryCode; label: string }> {
  return Object.values(INDUSTRIES).map((industry) => ({
    value: industry.code,
    label: industry.name,
  }))
}

// Pre-compute grouped mappings at module load (performance optimization)
const GROUPED_MAPPINGS = (() => {
  const grouped: Record<IndustryCode, string[]> = {
    FOOD_RESTAURANT: [],
    RETAIL: [],
    BEAUTY_FITNESS: [],
    EDUCATION: [],
    HEALTHCARE: [],
    NONPROFIT: [],
    REAL_ESTATE: [],
    ENTERTAINMENT: [],
    PROFESSIONAL_SERVICES: [],
    DEFAULT: [],
  }

  for (const [fbCategory, industryCode] of Object.entries(FB_CATEGORY_MAP)) {
    grouped[industryCode].push(fbCategory)
  }

  // Sort alphabetically within each group
  for (const code of Object.keys(grouped) as IndustryCode[]) {
    grouped[code].sort()
  }

  return grouped
})()

/**
 * Get all Facebook categories grouped by industry code (pre-computed)
 * @returns Record of industry codes to sorted arrays of FB categories
 */
export function getGroupedMappings(): Record<IndustryCode, string[]> {
  return GROUPED_MAPPINGS // O(1) lookup
}

/**
 * Format category mapping for display
 */
export function formatCategoryMapping(fbCategory: string | null): {
  fbCategory: string | null
  industryCode: IndustryCode
  industryName: string
} {
  if (!fbCategory?.trim()) {
    return {
      fbCategory: null,
      industryCode: 'DEFAULT',
      industryName: INDUSTRIES.DEFAULT.name,
    }
  }

  const industryCode = getIndustryFromFbCategory(fbCategory)
  const industryName = INDUSTRIES[industryCode].name

  return { fbCategory: fbCategory.trim(), industryCode, industryName }
}
