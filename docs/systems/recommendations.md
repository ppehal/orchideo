# Recommendations System

> Generating actionable recommendations from trigger evaluations.

---

## Overview

The recommendations system prioritizes and presents improvement suggestions based on trigger scores and category weights.

---

## Impact Calculation

Each trigger's potential impact is calculated as:

```
impact = (100 - score) * categoryWeight
```

**Example:**

- Trigger BASIC_001 scores 45 (NEEDS_IMPROVEMENT)
- BASIC category weight = 0.35
- Impact = (100 - 45) \* 0.35 = 19.25

Higher impact = higher priority for recommendation.

---

## Top Recommendations Selection

1. Filter triggers with score < 85 (non-EXCELLENT)
2. Calculate impact for each
3. Sort by impact descending
4. Take top N recommendations (usually 3-5)

```typescript
function getTopRecommendations(
  evaluations: TriggerEvaluation[],
  count: number = 5
): TriggerEvaluation[] {
  return evaluations
    .filter((e) => e.score < SCORE_THRESHOLDS.EXCELLENT && e.recommendation)
    .map((e) => ({
      ...e,
      impact: (100 - e.score) * CATEGORY_WEIGHTS[e.category],
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, count)
}
```

---

## Recommendation Text Generation

Each trigger generates its own recommendation text based on the evaluation:

### Pattern 1: Simple Threshold

```typescript
// tech-001-visual-sizes.ts
if (score < 85) {
  recommendation = 'Pouzivejte obrazky 1200x630 px pro optimalni zobrazeni'
}
```

### Pattern 2: Dynamic Value

```typescript
// cont-001-content-mix.ts
if (analysis.salesPct > idealSales + 10) {
  recommendation = `Snizte podil prodejniho obsahu z ${salesPct}% na max ${idealSales}%`
}
```

### Pattern 3: Context-Based

```typescript
// basic-001-interactions.ts
const engagementPct = formatPercent(engagementRate * 100, 2)
recommendation = `Zvyste interakce pomoci otazek, anket a CTA v prispevech`
```

---

## Recommendation Structure

```typescript
interface TriggerEvaluation {
  // ... other fields
  recommendation?: string // Czech text, actionable
  details?: {
    currentValue?: string | number // "2.5%"
    targetValue?: string | number // ">=3%"
    context?: string // "Prumerne 45 interakci na prispevek"
  }
}
```

---

## Display Categories

Recommendations are grouped by status for UI display:

| Status            | Color  | Priority |
| ----------------- | ------ | -------- |
| CRITICAL          | Red    | 1        |
| NEEDS_IMPROVEMENT | Yellow | 2        |
| GOOD              | Blue   | 3        |
| EXCELLENT         | Green  | Hidden   |

---

## UI Components

### TopRecommendations Component

```tsx
// src/components/report/top-recommendations.tsx
<TopRecommendations recommendations={topRecommendations} maxItems={5} />
```

Displays:

- Trigger name
- Current vs target value
- Status badge (color-coded)
- Recommendation text

### Category Breakdown

Shows scores by category with visual progress bars:

- BASIC: 72/100
- CONTENT: 65/100
- etc.

---

## Industry Benchmarks

Recommendations adjust based on industry:

```typescript
interface IndustryBenchmarkData {
  ideal_engagement_pct: number // 60% default
  ideal_sales_pct: number // 15% default
  ideal_brand_pct: number // 25% default
  ideal_posts_per_week: number // 4 default
  avg_engagement_rate: number // 2% default
}
```

**Example adjustment:**

- E-commerce: Higher sales content tolerance (20%)
- Non-profit: Lower sales content tolerance (10%)

---

## Fallback Recommendations

When data is insufficient:

```typescript
details: {
  reason: 'INSUFFICIENT_DATA',
  context: 'Nedostatek dat pro presne vyhodnoceni'
}
recommendation: undefined  // No recommendation for fallback
```

Fallback triggers (score=50) are excluded from top recommendations.

---

## Localization

All recommendations are in Czech:

| English Term | Czech         |
| ------------ | ------------- |
| Increase     | Zvyste        |
| Decrease     | Snizte        |
| Use          | Pouzivejte    |
| Add          | Pridejte      |
| Optimize     | Optimalizujte |
| at least     | alespon       |
| maximum      | maximalne     |

---

## Example Output

```json
{
  "topRecommendations": [
    {
      "id": "CONT_001",
      "name": "Obsahovy mix",
      "score": 45,
      "status": "NEEDS_IMPROVEMENT",
      "impact": 16.5,
      "recommendation": "Snizte podil prodejniho obsahu z 35% na max 15%",
      "details": {
        "currentValue": "30% eng / 35% sales / 35% brand",
        "targetValue": ">=60% eng / <=15% sales"
      }
    },
    {
      "id": "BASIC_001",
      "name": "Interakce na prisp.",
      "score": 60,
      "status": "NEEDS_IMPROVEMENT",
      "impact": 14.0,
      "recommendation": "Zvyste interakce pomoci otazek, anket a CTA"
    }
  ]
}
```
