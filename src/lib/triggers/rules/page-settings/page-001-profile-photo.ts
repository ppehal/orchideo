import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'PAGE_001'
const TRIGGER_NAME = 'Profilová fotka'
const TRIGGER_DESCRIPTION = 'Kvalita a rozměry profilové fotky'
const TRIGGER_CATEGORY = 'PAGE_SETTINGS' as const

// Ideal dimensions for profile photo
const IDEAL_SIZE = 320
const MIN_SIZE = 176

// We can't directly get profile photo dimensions from the API
// but we can check if a profile photo exists and provide guidance
function evaluate(input: TriggerInput): TriggerEvaluation {
  const { pageData } = input

  // Check if profile picture exists
  if (!pageData.picture_url) {
    return {
      id: TRIGGER_ID,
      name: TRIGGER_NAME,
      description: TRIGGER_DESCRIPTION,
      category: TRIGGER_CATEGORY,
      score: 20,
      status: 'CRITICAL',
      recommendation: 'Nahrajte profilovou fotku pro lepší rozpoznatelnost stránky',
      details: {
        currentValue: 'Chybí',
        targetValue: `${IDEAL_SIZE}x${IDEAL_SIZE} px`,
        context: 'Profilová fotka je důležitá pro identitu značky',
      },
    }
  }

  // Profile photo exists - we give a good score since we can't measure dimensions
  // In production, you could use image analysis service to check dimensions
  const score = 80

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score,
    status: getStatus(score),
    recommendation:
      score < 85
        ? `Doporučujeme profilovou fotku v rozlišení ${IDEAL_SIZE}x${IDEAL_SIZE} px`
        : undefined,
    details: {
      currentValue: 'Nastavena',
      targetValue: `${IDEAL_SIZE}x${IDEAL_SIZE} px`,
      context: `Minimální doporučená velikost je ${MIN_SIZE}x${MIN_SIZE} px`,
    },
  }
}

const rule: TriggerRule = {
  id: TRIGGER_ID,
  name: TRIGGER_NAME,
  description: TRIGGER_DESCRIPTION,
  category: TRIGGER_CATEGORY,
  evaluate,
}

registerTrigger(rule)

export default rule
