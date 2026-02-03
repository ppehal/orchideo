# Analysis Pipeline

> Data collection, normalization, and trigger evaluation flow.

---

## Overview

The analysis pipeline processes Facebook page data through three stages:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Collector  │───▶│ Normalizer  │───▶│   Runner    │
│  (FB API)   │    │ (transform) │    │ (evaluate)  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
   Raw Posts         NormalizedPost    TriggerResult[]
```

**Key files:**

- `src/lib/services/analysis/collector.ts` - Facebook data fetching
- `src/lib/services/analysis/normalizer.ts` - Data transformation
- `src/lib/services/analysis/runner.ts` - Orchestration
- `src/lib/services/analysis/types.ts` - Type definitions

---

## Status Lifecycle

```
PENDING ──▶ COLLECTING_DATA ──▶ ANALYZING ──▶ COMPLETED
    │              │                │              │
    └──────────────┴────────────────┴──────▶ FAILED
```

| Status          | Progress | Description                        |
| --------------- | -------- | ---------------------------------- |
| PENDING         | 5%       | Analysis created, waiting to start |
| COLLECTING_DATA | 40%      | Fetching data from Facebook API    |
| ANALYZING       | 75%      | Running trigger evaluations        |
| COMPLETED       | 100%     | Analysis finished successfully     |
| FAILED          | 100%     | Error occurred during analysis     |

---

## Collector

Fetches raw data from Facebook Graph API:

```typescript
interface CollectorResult {
  success: boolean
  data: CollectedData | null
  errors: CollectorError[]
  partialSuccess: boolean // Some data collected despite errors
}

interface CollectedData {
  pageData: NormalizedFacebookPage // Page metadata
  posts: RawPost[] // Up to 90 days of posts
  insights: PageInsights | null // Page-level insights
  collectedAt: Date
  metadata: {
    postsCollected: number
    oldestPostDate: Date | null
    newestPostDate: Date | null
    insightsAvailable: boolean
    daysOfData: number
  }
}
```

### Collection Process

1. **Page metadata** (required) - Name, fan count, picture, cover
2. **Feed posts** - Last 90 days, with reactions/comments/shares
3. **Page insights** - 28 days of page-level metrics (optional)

Feed and insights are fetched in parallel using `Promise.allSettled`.

### Collector Options

```typescript
interface CollectorOptions {
  maxPosts?: number // Max posts to fetch (default: 100)
  maxFeedPages?: number // Max pagination pages
  feedDaysBack?: number // Days to look back (default: 90)
  insightsDaysBack?: number // Insights period (default: 28)
}
```

---

## Normalizer

Transforms raw Facebook API data into standardized format.

### NormalizedPost Structure

```typescript
interface NormalizedPost {
  id: string
  created_time: Date
  message: string | null
  type: 'photo' | 'video' | 'link' | 'status' | 'reel' | 'shared' | 'other'

  // Engagement metrics
  reactions_count: number
  comments_count: number
  shares_count: number
  total_engagement: number // sum of above

  // Text analysis flags
  message_length: number
  emoji_count: number
  has_double_line_breaks: boolean
  has_emoji_bullets: boolean
  has_inline_links: boolean
  has_utm_params: boolean

  // Content type flags
  is_youtube_link: boolean
  is_shared_post: boolean
  is_reel: boolean

  // Media metadata
  has_media: boolean
  media_type: 'image' | 'video' | 'none'
  image_width: number | null
  image_height: number | null
  image_format: string | null // jpeg, png, gif, webp

  // Post insights (if available)
  impressions: number | null
  impressions_organic: number | null
  impressions_paid: number | null
  reach: number | null
  clicks: number | null

  // Reaction breakdown
  reaction_like: number
  reaction_love: number
  reaction_wow: number
  reaction_haha: number
  reaction_sad: number
  reaction_angry: number

  permalink_url: string | null
}
```

### Text Analysis

The normalizer detects:

| Pattern            | Detection Method                    |
| ------------------ | ----------------------------------- |
| Emoji count        | Unicode emoji regex matching        |
| Double line breaks | `/\n\s*\n/` for paragraph structure |
| Emoji bullets      | Emoji at start of 2+ lines          |
| Inline links       | `https?://` in message text         |
| UTM parameters     | `?utm_` or `&utm_` in URLs          |
| YouTube links      | `youtube.com` or `youtu.be` in URLs |

### Post Type Detection

```typescript
function determinePostType(post: RawPost): PostType {
  if (isSharedPost(post)) return 'shared'
  if (isReel(post)) return 'reel'
  if (post.type === 'photo') return 'photo'
  if (post.type === 'video') return 'video'
  if (post.type === 'link') return 'link'
  if (post.type === 'status') return 'status'
  return 'other'
}
```

---

## Runner

Orchestrates the complete analysis pipeline.

### Analysis Flow

```typescript
async function runAnalysis(analysisId: string): Promise<RunnerResult> {
  // 1. Load analysis record with Facebook page data
  const analysis = await prisma.analysis.findUnique(...)

  // 2. Decrypt page access token
  const accessToken = decrypt(fbPage.page_access_token)

  // 3. Update status: COLLECTING_DATA
  await updateAnalysisStatus(analysisId, 'COLLECTING_DATA')

  // 4. Collect data from Facebook (with timeout)
  const collectionResult = await Promise.race([
    collectAnalysisData(fbPage.fb_page_id, accessToken),
    timeoutPromise,
  ])

  // 5. Update status: ANALYZING
  await updateAnalysisStatus(analysisId, 'ANALYZING')

  // 6. Normalize collected data
  const normalizedData = normalizeCollectedData(collectionResult.data)

  // 7. Load industry benchmark
  const benchmark = await prisma.industryBenchmark.findUnique(...)

  // 8. Run all triggers
  const evaluationResult = evaluateAll(triggerInput)

  // 9. Save trigger results to database
  await saveTriggerResults(analysisId, evaluationResult.evaluations)

  // 10. Update status: COMPLETED
  await updateAnalysisStatus(analysisId, 'COMPLETED', {
    rawData: normalizedData,
    overall_score: evaluationResult.overallScore,
  })
}
```

### Timeout Handling

Default timeout: 60 seconds (`ANALYSIS_TIMEOUT_MS` env variable)

```typescript
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => {
    reject(new Error('Analysis timeout exceeded'))
  }, ANALYSIS_TIMEOUT_MS)
})
```

### Background Execution

Analysis runs in background (fire-and-forget):

```typescript
export function startAnalysisInBackground(analysisId: string): void {
  runAnalysis(analysisId).catch((error) => {
    log.error({ error }, 'Background analysis failed unexpectedly')
  })
}
```

---

## Stored Data

### Analysis Record

```typescript
interface AnalysisRawData {
  pageData: NormalizedFacebookPage
  posts90d: NormalizedPost[]
  insights28d: PageInsights | null
  collectionMetadata: {
    collectedAt: string
    postsCollected: number
    oldestPostDate: string | null
    newestPostDate: string | null
    insightsAvailable: boolean
    daysOfData: number
  }
}
```

Stored as JSON in `Analysis.rawData` field.

**Database Fields:**

| Field              | Type     | Description                                              |
| ------------------ | -------- | -------------------------------------------------------- |
| `page_name`        | String?  | Snapshot of page name at analysis time                   |
| `page_picture`     | String?  | Snapshot of page picture URL                             |
| `page_fan_count`   | Int?     | Snapshot of fan count                                    |
| `fb_page_category` | String?  | Original Facebook category (e.g., "Restaurant")          |
| `industry_code`    | String   | Mapped industry for benchmarking (default: "DEFAULT")    |
| `overall_score`    | Int?     | 0-100 overall score                                      |
| `rawData`          | Json?    | Full normalized data (posts, insights, metadata)         |

**Note:** `fb_page_category` added in v1.4.0 for category mapping visualization. Nullable for backward compatibility with analyses created before this feature.

### Trigger Results

Each evaluation is stored in `TriggerResult` table:

| Field        | Description                                  |
| ------------ | -------------------------------------------- |
| trigger_code | e.g., "BASIC_001"                            |
| category     | BASIC, CONTENT, etc.                         |
| score        | 0-100                                        |
| status       | EXCELLENT, GOOD, NEEDS_IMPROVEMENT, CRITICAL |
| value        | Measured value (parsed from details)         |
| threshold    | Target value (parsed from details)           |
| details      | JSON with name, description, recommendation  |

---

## Error Handling

### Collector Errors

```typescript
interface CollectorError {
  component: 'pageData' | 'feed' | 'insights' | 'postInsights'
  message: string
  code?: string
  recoverable: boolean // If true, analysis can continue
}
```

### Analysis Error Codes

| Code             | Description                     |
| ---------------- | ------------------------------- |
| NOT_FOUND        | Analysis record not found       |
| PAGE_NOT_FOUND   | Facebook page not found         |
| DECRYPTION_ERROR | Token decryption failed         |
| COLLECTION_ERROR | Facebook data collection failed |
| TIMEOUT          | Analysis exceeded time limit    |
| INTERNAL_ERROR   | Unexpected error                |

---

## Analytics Events

Events logged during analysis:

| Event              | When                           |
| ------------------ | ------------------------------ |
| analysis_started   | Analysis created               |
| analysis_completed | Analysis finished successfully |
| analysis_failed    | Analysis failed with error     |

Metadata includes:

- `elapsed_ms` - Processing time
- `posts_collected` - Number of posts
- `insights_available` - Whether insights were fetched
- `overall_score` - Final score (on success)
- `error_code` - Error code (on failure)
