---
title: 'Phase 2: Historical Trends & Comparison Architecture'
status: 'accepted'
date: '2026-01-31'
deciders: ['Claude']
tags: [architecture, trends, pdf, comparison]
---

# ADR-002: Phase 2 Historical Trends & Comparison Architecture

## Context

Orchideo potřebuje rozšířit funkcionalitu o:

1. **Historical Trends** - sledování vývoje metrik v čase
2. **PDF Export** - generování PDF reportů s cache
3. **Competitor Comparison** - porovnání vlastních stránek

## Decision

### 1. Snapshot-based Trend Architecture

**Rozhodnutí:** Denormalizované snapshoty místo real-time výpočtů.

```
Analysis (completed) → AnalysisSnapshot → Trend calculations
```

**Důvody:**

- Rychlé dotazy bez JOIN přes rawData JSON
- Historická konzistence (data se nemění zpětně)
- Verzování scoring/benchmark algoritmů
- Jednoduchý backfill existujících dat

**Alternativy zvážené:**

- Real-time výpočty z rawData - pomalé, nekonzistentní při změně algoritmu
- Event sourcing - over-engineering pro tento use case

### 2. Puppeteer for PDF Generation

**Rozhodnutí:** Puppeteer-core + @sparticuz/chromium pro serverless-compatible PDF.

**Důvody:**

- Pixel-perfect rendering existujícího React UI
- Podpora print CSS
- Funguje v Docker/serverless
- Není potřeba duplicitní PDF template

**Alternativy zvážené:**

- react-pdf - vyžaduje separátní komponenty, duplicita
- wkhtmltopdf - problémy s moderním CSS
- HTML-to-PDF libraries - omezená CSS podpora

### 3. File-based PDF Cache

**Rozhodnutí:** Filesystem cache + DB metadata místo blob storage.

```
PDF file → storage/reports/{token}-{hash}.pdf
Metadata → ReportArtifact (analysisId, params_hash, file_path)
```

**Důvody:**

- Jednoduché pro MVP
- Snadná migrace na S3 později
- Cache key = hash(token + branding params + pdf_version)

### 4. Dense Ranking for Comparisons

**Rozhodnutí:** Dense ranking (ties get same rank) pro competitor comparison.

```
[100, 90, 90, 80] → ranks [1, 2, 2, 3]
```

**Důvody:**

- Intuitivní pro uživatele
- Spravedlivé při shodných hodnotách
- Standardní approach v benchmarkingu

### 5. Read-only GET, Side-effect POST

**Rozhodnutí:** GET comparison je read-only, POST ukládá snapshot.

**Důvody:**

- REST semantika
- Uživatel kontroluje, kdy se uloží snapshot
- Možnost "preview" bez persistence

## Consequences

### Positive

- Rychlé trend queries díky denormalizaci
- PDF cache snižuje load na Puppeteer
- Flexibilní comparison bez side effects
- Snadný backfill historických dat

### Negative

- Duplicita dat (rawData + snapshot)
- Filesystem cache vyžaduje persistent storage
- Puppeteer zvyšuje Docker image size (~400MB)

### Risks

- Rate limit memory leak (mitigated: hourly cleanup)
- PDF orphan files (mitigated: cleanup on DB error)
- Snapshot drift při změně algoritmu (mitigated: version tracking)

## Implementation

- `AnalysisSnapshot` - created after each completed analysis
- `TrendAlert` - created when thresholds exceeded
- `ReportArtifact` - PDF cache metadata
- `CompetitorGroup/Page/Comparison` - comparison domain

## Related

- ADR-001: Trigger Engine Architecture
