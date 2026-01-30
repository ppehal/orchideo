# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
  - Facebook OAuth provider with required permissions (pages_show_list, pages_read_engagement, pages_read_user_content, read_insights)
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
