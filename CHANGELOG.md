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
