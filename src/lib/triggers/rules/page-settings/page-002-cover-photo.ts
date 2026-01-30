import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'PAGE_002'
const TRIGGER_NAME = 'Cover fotka'
const TRIGGER_DESCRIPTION = 'Kvalita a rozměry cover fotky'
const TRIGGER_CATEGORY = 'PAGE_SETTINGS' as const

// Ideal dimensions for cover photo
const IDEAL_WIDTH = 851
const IDEAL_HEIGHT = 315
const MIN_WIDTH = 820
const MIN_HEIGHT = 312

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { pageData } = input

  // Check if cover photo exists
  if (!pageData.cover_url) {
    return {
      id: TRIGGER_ID,
      name: TRIGGER_NAME,
      description: TRIGGER_DESCRIPTION,
      category: TRIGGER_CATEGORY,
      score: 20,
      status: 'CRITICAL',
      recommendation: 'Nahrajte cover fotku pro profesionální vzhled stránky',
      details: {
        currentValue: 'Chybí',
        targetValue: `${IDEAL_WIDTH}x${IDEAL_HEIGHT} px`,
        context: 'Cover fotka je první věc, kterou návštěvníci vidí',
      },
    }
  }

  // Cover photo exists - give good score
  // In production, you could analyze dimensions via image service
  const score = 85

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score,
    status: getStatus(score),
    recommendation: undefined,
    details: {
      currentValue: 'Nastavena',
      targetValue: `${IDEAL_WIDTH}x${IDEAL_HEIGHT} px`,
      context: `Minimální velikost ${MIN_WIDTH}x${MIN_HEIGHT} px pro ostré zobrazení`,
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
