# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Dark/Light Theme Support**
  - ThemeProvider integration using next-themes (system/light/dark modes)
  - Theme toggle dropdown in header (visible for all users)
  - Theme toggle in mobile navigation menu
  - Persistence via localStorage

- **Phase 2: Historical Trends, PDF Export, Competitor Comparison**
  - **Historical Trends**
    - `AnalysisSnapshot` model - denormalized metrics for trend calculations
    - `TrendAlert` model with 6 alert types (score drop/improvement, engagement drop/improvement, posting frequency changes)
    - Snapshot service - automatic snapshot creation after analysis completion
    - Trend service - calculates trends with reliability assessment
    - Alert service - detects significant changes and creates alerts
    - Integration into analysis runner
    - API: `GET /api/pages/[pageId]/trends` - get trend data for a page
    - API: `GET /api/user/alerts` - list user alerts with pagination
    - API: `PATCH /api/user/alerts` - mark all alerts as read
    - API: `PATCH /api/user/alerts/[id]` - mark single alert as read
    - Backfill script for existing analyses (`scripts/backfill-snapshots.ts`)

  - **PDF Export**
    - `ReportArtifact` model for PDF caching
    - Analysis branding fields (company_name, custom_logo_url, hide_orchideo_branding)
    - PDF service with Puppeteer + @sparticuz/chromium
    - Semaphore utility for concurrency control
    - Rate limiting (3 requests/hour per token)
    - Print CSS styles in globals.css
    - Report page print mode support with `data-pdf-ready` attribute
    - API: `POST /api/report/[token]/pdf` - generate/retrieve cached PDF
    - Docker Chromium configuration

  - **Competitor Comparison**
    - `CompetitorGroup` model - groups for comparison
    - `CompetitorPage` model - competitors in a group
    - `CompetitorComparison` model - saved comparison snapshots
    - Comparison service with dense ranking algorithm
    - Reliability assessment for comparisons
    - API: `GET/POST /api/competitor-groups` - list/create groups
    - API: `GET/DELETE /api/competitor-groups/[id]` - get/delete group
    - API: `GET /api/competitor-groups/[id]/comparison` - compute comparison (read-only)
    - API: `POST /api/competitor-groups/[id]/comparison` - save comparison snapshot

### Fixed

- Duplicate competitor page IDs are now deduplicated in group creation
- Rate limit memory leak - expired entries are now cleaned up hourly
- PDF generation orphan files - files are cleaned up on database errors

- **Phase 0: Project Setup & Infrastructure**
  - Next.js 16 with React 19, TypeScript strict mode, Tailwind CSS 4
  - Prisma 6 with PostgreSQL 16 (Docker)
  - Auth.js v5 with Google OAuth provider
  - Pino structured logging with redacted sensitive fields
  - shadcn/ui components (Button, Card, Input, Select, Badge, Progress, Skeleton, Dialog, Sheet, Sonner)
  - Custom UI components (LoadingSpinner, EmptyState, ConfirmDialog, LoadingButton, NullValue)
  - Marketing layout with Header/Footer
  - Dashboard layout with authentication guard
  - Login page with Google OAuth
  - ESLint 9 + Prettier + Husky + Commitlint
  - GitHub Actions CI workflow (lint, type-check, format, build)
  - Docker support with multi-stage build
  - Database schema with all MVP models (User, Account, Session, FacebookPage, Analysis, TriggerResult, IndustryBenchmark, AnalyticsEvent)
  - Industry benchmark seed data (10 industries)

- **Phase 1: Facebook OAuth & Page Selection**
  - Business Portfolio pages support - getManagedPages now includes pages from `/me/businesses/{id}/owned_pages`
  - Facebook OAuth provider with required permissions (pages_show_list, pages_read_engagement, pages_read_user_content, read_insights, business_management)
  - Token encryption utilities (AES-256-GCM) for secure page_access_token storage
  - Facebook Graph API client with timeout handling and custom error class
  - Facebook URL parser for extracting page username/ID from various URL formats
  - Page Selector UI with URL input form and page list
  - Facebook pages API endpoint (/api/facebook/pages)
  - Analysis creation API endpoint (/api/analysis/create)
  - Analysis status polling API endpoint (/api/analysis/[id]/status)
  - Analysis progress page with real-time status updates
  - Facebook connect button for users logged in with Google
  - Server actions for creating Analysis with encrypted page tokens
