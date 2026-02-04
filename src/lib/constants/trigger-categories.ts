export type TriggerCategory =
  | 'BASIC'
  | 'CONTENT'
  | 'TECHNICAL'
  | 'TIMING'
  | 'SHARING'
  | 'PAGE_SETTINGS'

export const TRIGGER_CATEGORY_LABELS: Record<TriggerCategory, string> = {
  BASIC: 'Základní metriky',
  CONTENT: 'Obsah',
  TECHNICAL: 'Technické aspekty',
  TIMING: 'Časování',
  SHARING: 'Sdílení',
  PAGE_SETTINGS: 'Nastavení stránky',
}

export const TRIGGER_CATEGORY_CONFIG: Record<
  TriggerCategory,
  { title: string; description: string; icon: string }
> = {
  BASIC: {
    title: TRIGGER_CATEGORY_LABELS.BASIC,
    description: 'Engagement a interakce s fanoušky',
    icon: '📊',
  },
  CONTENT: {
    title: TRIGGER_CATEGORY_LABELS.CONTENT,
    description: 'Kvalita a struktura příspěvků',
    icon: '📝',
  },
  TECHNICAL: {
    title: TRIGGER_CATEGORY_LABELS.TECHNICAL,
    description: 'Formáty, velikosti a technická kvalita',
    icon: '⚙️',
  },
  TIMING: {
    title: TRIGGER_CATEGORY_LABELS.TIMING,
    description: 'Frekvence a načasování příspěvků',
    icon: '⏰',
  },
  SHARING: {
    title: TRIGGER_CATEGORY_LABELS.SHARING,
    description: 'Strategie sdílení obsahu',
    icon: '🔗',
  },
  PAGE_SETTINGS: {
    title: TRIGGER_CATEGORY_LABELS.PAGE_SETTINGS,
    description: 'Profilová a cover fotka',
    icon: '🖼️',
  },
}

// Category weights for overall score calculation
export const CATEGORY_WEIGHTS: Record<TriggerCategory, number> = {
  BASIC: 0.35,
  CONTENT: 0.3,
  TECHNICAL: 0.2,
  TIMING: 0.05,
  SHARING: 0.05,
  PAGE_SETTINGS: 0.05,
}
