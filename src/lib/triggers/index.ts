// Types
export * from './types'

// Registry
export * from './registry'

// Engine
export {
  evaluateAll,
  evaluateCategory,
  calculateOverallScore,
  getStatus,
  type EvaluationResult,
} from './engine'

// Utils (excluding calculateOverallScore which is re-exported from engine)
export {
  normalizeScore,
  calculateAverageScore,
  calculateCategoryScore,
  createFallbackEvaluation,
  calculatePercentage,
  scoreFromPercentage,
  formatPercent,
  formatNumber,
} from './utils'

// Import all trigger rules to register them
import './rules'
