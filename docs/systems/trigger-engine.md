# Trigger Engine

> Rule-based evaluation system for Facebook page analysis.

---

## Overview

The Trigger Engine evaluates Facebook page performance using a registry of trigger rules. Each trigger analyzes specific aspects of the page and returns a score (0-100) with recommendations.

---

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  TriggerInput   │────▶│    Engine    │────▶│ EvaluationResult│
│  (page + posts) │     │ evaluateAll()│     │ (scores + recs) │
└─────────────────┘     └──────┬───────┘     └─────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   Trigger Registry  │
                    │  (27 trigger rules) │
                    └─────────────────────┘
```

**Key files:**

- `src/lib/triggers/engine.ts` - Core evaluation engine
- `src/lib/triggers/registry.ts` - Trigger registration
- `src/lib/triggers/types.ts` - Type definitions
- `src/lib/triggers/utils.ts` - Scoring utilities
- `src/lib/triggers/rules/` - Individual trigger implementations
- `src/lib/constants/trigger-categories/` - Category definitions for detail pages

**Related documentation:**

- [Trigger Definitions](./trigger-definitions.md) - Complete category matrix for BASIC_001 (64 combinations)

---

## Category Weights

Categories contribute different weights to the overall score:

| Category      | Weight | Description                      |
| ------------- | ------ | -------------------------------- |
| BASIC         | 35%    | Core engagement metrics          |
| CONTENT       | 30%    | Content mix and performance      |
| TECHNICAL     | 20%    | Technical quality (images, text) |
| TIMING        | 5%     | Posting frequency and timing     |
| SHARING       | 5%     | External content sharing         |
| PAGE_SETTINGS | 5%     | Profile and cover photos         |

Defined in `src/lib/triggers/types.ts`:

```typescript
export const CATEGORY_WEIGHTS: Record<TriggerCategory, number> = {
  BASIC: 0.35,
  CONTENT: 0.3,
  TECHNICAL: 0.2,
  TIMING: 0.05,
  SHARING: 0.05,
  PAGE_SETTINGS: 0.05,
}
```

---

## Score Thresholds

Scores map to status values:

| Score Range | Status            | UI Color |
| ----------- | ----------------- | -------- |
| 85-100      | EXCELLENT         | Green    |
| 70-84       | GOOD              | Blue     |
| 40-69       | NEEDS_IMPROVEMENT | Yellow   |
| 0-39        | CRITICAL          | Red      |

```typescript
export const SCORE_THRESHOLDS = {
  EXCELLENT: 85,
  GOOD: 70,
  NEEDS_IMPROVEMENT: 40,
}
```

---

## Trigger Input

Each trigger receives standardized input:

```typescript
interface TriggerInput {
  pageData: NormalizedFacebookPage // Page metadata
  posts90d: NormalizedPost[] // Last 90 days of posts
  insights28d: PageInsights | null // Page insights (if available)
  industryBenchmark: IndustryBenchmarkData // Industry-specific thresholds
  collectionMetadata?: {
    // Optional error context (added 2026-02-04)
    insightsError?: string | null // Error code if insights failed
    insightsErrorMessage?: string | null // User-friendly Czech error message
  }
}
```

**Error Metadata Usage:**

When insights are unavailable, triggers can access the actual Facebook error message instead of showing a generic fallback:

```typescript
// Example: BASIC_004 trigger
if (!insights28d) {
  return createFallbackEvaluation(
    TRIGGER_ID,
    TRIGGER_NAME,
    TRIGGER_DESCRIPTION,
    TRIGGER_CATEGORY,
    'METRIC_UNAVAILABLE',
    input.collectionMetadata?.insightsErrorMessage ||
      'Page Insights nejsou dostupné (vyžadují oprávnění read_insights)' // Fallback
  )
}
```

**Available error messages:**

- `PERMISSION_DENIED`: "Chybí oprávnění read_insights. Přihlaste se znovu přes Facebook."
- `NOT_SUPPORTED`: "Tato stránka nepodporuje insights (např. příliš málo sledujících)."
- `RATE_LIMITED`: "Facebook API limit překročen. Zkuste to později."
- `UNKNOWN`: "Nepodařilo se načíst insights. Zkuste to později."

---

## Trigger Evaluation Result

Each trigger returns:

```typescript
interface TriggerEvaluation {
  id: string // e.g., "BASIC_001"
  name: string // Czech display name
  description: string // What this trigger measures
  category: TriggerCategory // BASIC, CONTENT, etc.
  score: number // 0-100
  status: TriggerStatus // EXCELLENT, GOOD, etc.
  recommendation?: string // Improvement suggestion (if score < 85)
  details?: TriggerDetails // Metrics and context
}
```

---

## Fallback Evaluations

When data is insufficient, triggers return a fallback score of 50:

```typescript
type FallbackReason =
  | 'INSUFFICIENT_DATA' // Not enough posts
  | 'METRIC_UNAVAILABLE' // API data not available
  | 'NOT_APPLICABLE' // Trigger not relevant for this page
```

---

## Trigger Rules

### BASIC (5 triggers)

| ID        | Name                    | Description                               | Detail Page |
| --------- | ----------------------- | ----------------------------------------- | ----------- |
| BASIC_001 | Interakce na prisp.     | Engagement rate per post vs fan count     | ✓ 64 cats   |
| BASIC_002 | Struktura interakci     | Distribution of reactions/comments/shares | -           |
| BASIC_003 | Struktura reakci        | Types of reactions (like, love, etc.)     | -           |
| BASIC_004 | Kvalita novych fanousku | New fans engagement quality               | -           |
| BASIC_005 | Kvalita soucasnych fan. | Current fans engagement quality           | -           |

> **BASIC_001** has a dedicated detail page with 64 category combinations (4 fan ranges × 4 post frequencies × 4 interaction levels). See [Trigger Definitions](./trigger-definitions.md#basic_001) for the complete matrix.

### CONTENT (6 triggers)

| ID       | Name               | Description                          |
| -------- | ------------------ | ------------------------------------ |
| CONT_001 | Obsahovy mix       | Engagement/sales/brand content ratio |
| CONT_002 | Top prispevky      | Best performing posts analysis       |
| CONT_003 | Slabe prispevky    | Underperforming posts analysis       |
| CONT_004 | Propagovane prisp. | Paid promotion effectiveness         |
| CONT_005 | Formaty prispevku  | Photo/video/link/status distribution |
| CONT_006 | Kliky dle formatu  | Click-through by content format      |

### TECHNICAL (7 triggers)

| ID       | Name              | Description                              |
| -------- | ----------------- | ---------------------------------------- |
| TECH_001 | Velikosti obrazku | Image dimensions (optimal: 1200x630)     |
| TECH_002 | Typy souboru      | Image formats (JPEG vs PNG vs WebP)      |
| TECH_003 | Delka textu       | Post text length optimization            |
| TECH_004 | Odstavce          | Paragraph structure (double line breaks) |
| TECH_005 | Inline linky      | Links embedded in text                   |
| TECH_006 | Emoji             | Emoji usage in posts                     |
| TECH_007 | Emoji odrazky     | Emoji as bullet points                   |

### TIMING (3 triggers)

| ID       | Name            | Description                   |
| -------- | --------------- | ----------------------------- |
| TIME_001 | Nejlepsi hodiny | Best posting hours analysis   |
| TIME_002 | Frekvence post. | Posts per week vs benchmark   |
| TIME_003 | Nejlepsi dny    | Best days of week for posting |

### SHARING (4 triggers)

| ID        | Name              | Description                        |
| --------- | ----------------- | ---------------------------------- |
| SHARE_001 | Sdilene prispevky | Percentage of shared content       |
| SHARE_002 | YouTube videa     | YouTube link sharing effectiveness |
| SHARE_003 | Reels format      | Reels usage and performance        |
| SHARE_004 | UTM parametry     | UTM tracking usage in links        |

### PAGE_SETTINGS (2 triggers)

| ID       | Name            | Description           |
| -------- | --------------- | --------------------- |
| PAGE_001 | Profilova fotka | Profile photo quality |
| PAGE_002 | Cover fotka     | Cover photo quality   |

---

## Registry Pattern

Triggers self-register when imported:

```typescript
// src/lib/triggers/rules/basic/basic-001-interactions.ts
import { registerTrigger } from '../../registry'

const rule: TriggerRule = {
  id: 'BASIC_001',
  name: 'Interakce na prisp.',
  description: 'Prumerny engagement rate',
  category: 'BASIC',
  evaluate: (input) => { ... }
}

registerTrigger(rule)  // Auto-registers on import
```

All triggers are imported via `src/lib/triggers/rules/index.ts`.

---

## Creating a New Trigger

1. Create file in appropriate category folder:

   ```
   src/lib/triggers/rules/basic/basic-006-new-trigger.ts
   ```

2. Implement the trigger:

   ```typescript
   import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
   import { getStatus, createFallbackEvaluation } from '../../utils'
   import { registerTrigger } from '../../registry'

   const TRIGGER_ID = 'BASIC_006'
   const TRIGGER_NAME = 'Nazev triggeru'
   const TRIGGER_DESCRIPTION = 'Co trigger meri'
   const TRIGGER_CATEGORY = 'BASIC' as const

   function evaluate(input: TriggerInput): TriggerEvaluation {
     const { posts90d, pageData } = input

     // Check for sufficient data
     if (posts90d.length < 5) {
       return createFallbackEvaluation(
         TRIGGER_ID, TRIGGER_NAME, TRIGGER_DESCRIPTION, TRIGGER_CATEGORY,
         'INSUFFICIENT_DATA', 'Nedostatek dat'
       )
     }

     // Calculate score
     const score = calculateScore(...)

     return {
       id: TRIGGER_ID,
       name: TRIGGER_NAME,
       description: TRIGGER_DESCRIPTION,
       category: TRIGGER_CATEGORY,
       score,
       status: getStatus(score),
       recommendation: score < 85 ? 'Doporuceni...' : undefined,
       details: { ... }
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
   ```

3. Add import to category index:
   ```typescript
   // src/lib/triggers/rules/basic/index.ts
   import './basic-006-new-trigger'
   ```

---

## Overall Score Calculation

```typescript
function calculateOverallScore(triggers: TriggerEvaluation[]): number {
  // 1. Group triggers by category
  // 2. Calculate average score per category
  // 3. Apply category weights
  // 4. Return weighted average

  let totalScore = 0
  let totalWeight = 0

  for (const [category, categoryTriggers] of byCategory) {
    const categoryScore = average(categoryTriggers.map((t) => t.score))
    const weight = CATEGORY_WEIGHTS[category]
    totalScore += categoryScore * weight
    totalWeight += weight
  }

  return Math.round(totalScore / totalWeight)
}
```

---

## Testing

```typescript
import { evaluateAll } from '@/lib/triggers'

const input: TriggerInput = {
  pageData: mockPageData,
  posts90d: mockPosts,
  insights28d: null,
  industryBenchmark: defaultBenchmark,
}

const result = evaluateAll(input)

expect(result.overallScore).toBeGreaterThan(0)
expect(result.evaluations).toHaveLength(27)
```
