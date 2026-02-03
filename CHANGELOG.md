# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Post-Level Insights Enrichment for Reaction Data**
  - Implemented automatic collection of detailed reaction breakdowns (like, love, wow, haha, sad, angry) from Facebook API
  - Added `enrichPostsWithInsights()` function that fetches individual post insights before normalization
  - Concurrency control with Semaphore (max 5 parallel requests) to prevent API overload
  - Conservative rate limiting (100 requests/min) to respect Facebook API quotas
  - Timeout protection (2 min) with graceful fallback to basic data if enrichment fails
  - New `processedInsights` field on `FacebookPost` type for simplified insights format
  - Progress logging every 10 posts for observability
  - Feature enabled by default, can be disabled via `fetchPostInsights: false` option
  - Performance impact: Adds 30-90 seconds to analysis duration (acceptable for background job)
  - **Fixes:** BASIC_003 trigger (Reaction Structure Analysis) now receives actual data instead of returning INSUFFICIENT_DATA
  - **Data collected:** Reaction breakdowns, impressions (total/organic/paid), reach, clicks per post
  - **Backward compatible:** Posts without insights continue to work (graceful degradation)

### Fixed

- **Report Navigation - Scroll Position Restoration**
  - Fixed scroll position being lost when navigating back from trigger detail page
  - Implemented scroll restoration mechanism using sessionStorage
  - Added `useScrollRestoration` custom hook with SSR safety and responsive-awareness
  - Added `ReportClientWrapper` component using event delegation for optimal performance
  - Scroll restoration respects user's `prefers-reduced-motion` preference for accessibility
  - Viewport width validation (±100px tolerance) prevents wrong content after responsive layout changes
  - Double RAF ensures reliable DOM hydration before scroll restoration
  - Graceful degradation in private browsing mode (sessionStorage disabled)
  - Report page remains Server Component (wrapper adds client-side behavior)
  - Added `data-report-content` and `data-trigger-id` attributes for future enhancements
  - **Hardening:** Added empty string validation for keys/tokens to prevent collisions
  - **Hardening:** Added runtime type validation for sessionStorage data to prevent errors
  - **Hardening:** Filter left-click only (ignore right-click/middle-click) for better UX
  - **Hardening:** Added explicit return types and type guards for TypeScript safety

### Added

- **Facebook Category Mapping Visualization**
  - Added visual display of Facebook page category → Industry benchmark mapping
  - New `CategoryMappingBadge` component showing "Category → Industry" with Unicode arrow
  - Mapping displayed in 4 locations: PageSelector cards, IndustrySelector form, Report header, expandable reference section
  - New `CategoryMappingInfo` expandable component listing all 220+ category mappings grouped by industry
  - Pre-computed category groupings for O(1) lookup performance
  - Database: Added `fb_page_category` field to Analysis model (nullable for backward compatibility)
  - Runtime validation via `sanitizeIndustryCode()` prevents invalid industry codes
  - String sanitization with `sanitizeForDisplay()` (max 200 chars) for security
  - Enhanced `getIndustryFromFbCategory()` with whitespace trimming and partial matching
  - New module: `src/lib/constants/industry-validation.ts` for type-safe industry code handling
  - Updated `restart-analysis.ts` script with industry code validation
  - NULL-safe rendering throughout all components
  - Responsive design (mobile/tablet/desktop) with truncation for long category names

- **Page Selector - Search Functionality**
  - Added search input to filter pages by name or username
  - Real-time filtering with diacritics normalization (Czech characters support)
  - Search result counter showing number of matching pages
  - Clear search button (X icon) for quick filter reset
  - Empty state when no pages match search query
  - Disabled search input during loading state

### Fixed

- **URL Matching - Username Support**
  - Fixed URL matching for username-based Facebook URLs (e.g., `facebook.com/my-page-name`)
  - Added `username` field to Facebook API requests and responses
  - Previously only numeric page IDs were matched, now both ID and username work
  - Updated types: `PageListItem`, `FacebookPageItem` now include `username: string | null`

- **CategoryDisplay for 1D Triggers**
  - Added `CategoryDisplay1D` component for single-dimension triggers (18 triggers total)
  - Previously 1D triggers only showed current recommendation without ability to browse other categories
  - Now displays: badge with current category, recommendation, toggle to show all categories
  - Handles fallback states (INSUFFICIENT, UNAVAILABLE, INSUFFICIENT_DATA) - shows only badge + recommendation without toggle
  - Binary triggers (PAGE_001, PAGE_002) work correctly with 2 categories
  - Consistent styling with existing 2D/3D components
  - Affected triggers: CONT_002, CONT_003, CONT_004, CONT_006, SHARE_001-004, PAGE_001-002, TECH_001-007, TIME_001

### Added

- **Analysis History Page** (`/analyze/history`)
  - List of all user's analyses with filters (status, page, sort order)
  - URL-based filter state for shareable/bookmarkable filter combinations
  - Responsive layout: table on desktop (`md:`), cards on mobile
  - Status badges with semantic colors (`ANALYSIS_STATUS_CONFIG`)
  - Score visualization with color thresholds via `getScoreColor()`
  - Expired analysis detection with visual indication (opacity + "Vypršelo" badge)
  - Error message tooltips for failed analyses
  - Disconnected page indicator when `fb_page_id` is null
  - Empty states: no data vs no filter results
  - Navigation link added to header and mobile nav
  - New constants: `ANALYSIS_STATUS_CONFIG`, `ANALYSIS_STATUS_OPTIONS`, `ANALYSIS_STATUS_LABELS_SHORT`
  - Query functions: `getUserAnalyses()`, `getUserPages()` in `src/lib/actions/analysis-history.ts`

### Fixed

- **Facebook API - appsecret_proof**
  - Fixed `read_insights` permission errors (code 200 "Provide valid app ID")
  - Added `appsecret_proof` HMAC-SHA256 signature to all Graph API requests
  - Facebook requires this for secure API calls, especially insights endpoints
  - Root cause: `granular_scopes` didn't include `read_insights` without proof

- **PDF Export - Chromium Configuration**
  - Fixed PDF generation failures in Docker environment
  - Added `PUPPETEER_EXECUTABLE_PATH` and `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` environment variables to `docker-compose.vps.yml`
  - Updated `pdf-service.ts` to use system-installed Chromium in Docker with fallback to @sparticuz/chromium
  - Corrected Chromium executable path for Alpine Linux (`/usr/bin/chromium`)
  - Resolved issue where Puppeteer attempted to download Chromium instead of using pre-installed binary

### Added

- **Permissions Disclosure on Login Page**
  - GDPR 2026 compliant transparency component showing Facebook permissions before login
  - Expandable card with permission list (7 permissions with icons and descriptions)
  - Technical permission IDs displayed as code blocks (e.g., `pages_read_engagement`)
  - "What we DON'T do" trust-building section
  - WCAG AA accessible (44px touch targets, aria-expanded, keyboard navigation)
  - Dark mode support
  - New constants: `FB_PERMISSIONS`, `FB_PERMISSIONS_DONT_LIST` in `src/lib/constants/fb-permissions.ts`
  - New component: `src/components/auth/permissions-disclosure.tsx`

- **Trigger Detail Pages (All 27 Triggers)**
  - Detail page route `/report/[token]/trigger/[triggerId]` with Server Component
  - Input parameters display card showing calculation inputs
  - Formula debug card (visible when `SHOW_DEBUG_FORMULAS=true`)
  - Category display with personalized recommendations based on user's data
  - Current category highlighting with contextual advice
  - Expandable view to browse all category combinations
  - Loading skeleton state for async data fetching
  - Click-through navigation from TriggerCard to detail page
  - ENV variable `SHOW_DEBUG_FORMULAS` for debug mode
  - Category definitions for all trigger types:
    - BASIC (5): Interactions, structure, reactions, fan quality
    - CONTENT (6): Content mix, top/weak posts, promoted posts, formats, clicks
    - TECHNICAL (7): Visual sizes, file types, text length, paragraphs, links, emojis
    - TIMING (3): Best hours, posting frequency, best days
    - SHARING (4): Shared posts, YouTube, Reels, UTM tracking
    - PAGE_SETTINGS (2): Profile photo, cover photo
  - Extended metrics with `_inputParams`, `_formula`, `_categoryKey` fields in all 27 triggers
  - 27 category definition files in `src/lib/constants/trigger-categories/`
  - Documentation in `docs/systems/trigger-definitions.md`

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
    - API: `GET /api/competitor-groups/[id]/comparison?history=true` - get historical snapshots
    - HistorySelector component for browsing saved comparison snapshots
    - Historical comparison banner with date display and "back to current" action
    - Save snapshot button in ComparisonView

### Changed

- **Architecture Cleanup (Audit findings)**
  - Removed dead code: unused `getAnalysisStatus` server action
  - Extracted progress constants to `lib/constants/analysis-progress.ts` (DRY)
  - Added rate limiting to `GET /api/user/alerts` (60 req/min per user)
  - Cleaned up middleware - removed unused parameter
  - Updated docs to reflect removed server action

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
