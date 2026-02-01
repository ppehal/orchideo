import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus } from '../../utils'
import { registerTrigger } from '../../registry'
import { getCategoryKey } from '@/lib/constants/trigger-categories/page-002'

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
    const missingParams = [
      { key: 'status', label: 'Stav cover fotky', value: 'Chybí' },
      {
        key: 'recommendedSize',
        label: 'Doporučená velikost',
        value: `${IDEAL_WIDTH}×${IDEAL_HEIGHT} px`,
      },
      { key: 'minSize', label: 'Minimální velikost', value: `${MIN_WIDTH}×${MIN_HEIGHT} px` },
    ]
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
        metrics: {
          hasCoverPhoto: 'false',
          _inputParams: JSON.stringify(missingParams),
          _categoryKey: getCategoryKey(false),
        },
      },
    }
  }

  // Cover photo exists - give good score
  // In production, you could analyze dimensions via image service
  const score = 85

  // Extended data for detail page
  const inputParams = [
    { key: 'status', label: 'Stav cover fotky', value: 'Nastavena' },
    {
      key: 'recommendedSize',
      label: 'Doporučená velikost',
      value: `${IDEAL_WIDTH}×${IDEAL_HEIGHT} px`,
    },
    { key: 'minSize', label: 'Minimální velikost', value: `${MIN_WIDTH}×${MIN_HEIGHT} px` },
  ]

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
      metrics: {
        hasCoverPhoto: 'true',
        _inputParams: JSON.stringify(inputParams),
        _formula: `Score based on cover photo presence
Kategorie: EXISTS (photo set) or MISSING (no photo)`,
        _categoryKey: getCategoryKey(true),
      },
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
