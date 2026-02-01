/**
 * Trigger category definitions for detail pages
 */

// BASIC_001
export {
  BASIC_001_INTRO,
  BASIC_001_DIMENSIONS,
  BASIC_001_RECOMMENDATIONS,
  getCategoryKey as getBasic001CategoryKey,
} from './basic-001'
export type { CategoryDimension } from './basic-001'

// BASIC_002
export {
  BASIC_002_INTRO,
  BASIC_002_DIMENSIONS,
  BASIC_002_RECOMMENDATIONS,
  BASIC_002_MIN_INTERACTIONS,
  getCategoryKey as getBasic002CategoryKey,
  getComparisonCategory,
} from './basic-002'

// BASIC_003
export {
  BASIC_003_INTRO,
  BASIC_003_DIMENSIONS,
  BASIC_003_RECOMMENDATIONS,
  BASIC_003_MIN_REACTIONS,
  getCategoryKey as getBasic003CategoryKey,
} from './basic-003'

// BASIC_004
export {
  BASIC_004_INTRO,
  BASIC_004_DIMENSIONS,
  BASIC_004_RECOMMENDATIONS,
  BASIC_004_MIN_NEW_FANS,
  BASIC_004_QUALITY_THRESHOLD,
  getCategoryKey as getBasic004CategoryKey,
} from './basic-004'

// BASIC_005
export {
  BASIC_005_INTRO,
  BASIC_005_DIMENSIONS,
  BASIC_005_RECOMMENDATIONS,
  BASIC_005_REACH_THRESHOLDS,
  getCategoryKey as getBasic005CategoryKey,
  getFanCountCategory,
  getReachQuality,
} from './basic-005'
