# Orchideo Documentation

> Facebook page analysis and trigger-based recommendation tool.

---

## Quick Links

- [Getting Started](./guides/getting-started.md) - Setup guide
- [Architecture](./ARCHITECTURE.md) - System architecture
- [Tech Context](./tech-context.md) - Technology stack & patterns
- [CLAUDE.md](../CLAUDE.md) - Coding standards

---

## Documentation Structure

This documentation follows the [Diátaxis framework](https://diataxis.fr/):

| Category         | Purpose                  | Location             |
| ---------------- | ------------------------ | -------------------- |
| **Guides**       | How-to instructions      | `docs/guides/`       |
| **Reference**    | Technical specifications | `docs/reference/`    |
| **Systems**      | System explanations      | `docs/systems/`      |
| **Integrations** | External APIs            | `docs/integrations/` |
| **UI**           | Component patterns       | `docs/ui/`           |
| **Decisions**    | ADRs                     | `docs/decisions/`    |

---

## Guides

Step-by-step instructions for common tasks.

| Guide                                          | Description             |
| ---------------------------------------------- | ----------------------- |
| [Getting Started](./guides/getting-started.md) | Prerequisites and setup |
| [Deployment Guide](./guides/deployment.md)     | Deploy and rollback     |
| [Troubleshooting](./guides/troubleshooting.md) | Common issues           |

---

## Reference

Technical specifications and API documentation.

| Document                                              | Description            |
| ----------------------------------------------------- | ---------------------- |
| [API Routes](./reference/api-routes.md)               | REST API endpoints     |
| [Server Actions](./reference/server-actions.md)       | Next.js server actions |
| [Database Schema](./reference/database-schema.md)     | Prisma models          |
| [Environment Variables](./reference/env-variables.md) | Configuration          |

---

## Systems

Explanations of core business logic.

| System                                          | Description             |
| ----------------------------------------------- | ----------------------- |
| [Trigger Engine](./systems/trigger-engine.md)   | Rule evaluation system  |
| [Analysis Pipeline](./systems/analysis.md)      | FB data analysis        |
| [Recommendations](./systems/recommendations.md) | AI/rule recommendations |

---

## Integrations

External system integrations.

| Integration                                      | Description           |
| ------------------------------------------------ | --------------------- |
| [Facebook Graph API](./integrations/facebook.md) | FB page data fetching |

---

## UI Patterns

Component and design patterns.

| Pattern                                | Description      |
| -------------------------------------- | ---------------- |
| [Design System](./ui/design-system.md) | UI/UX guidelines |
| [Data Tables](./ui/data-tables.md)     | Table components |
| [Forms](./ui/forms.md)                 | Form patterns    |

---

## Decisions

Architecture Decision Records (ADRs).

| ADR                                         | Description  |
| ------------------------------------------- | ------------ |
| [000 Template](./decisions/000-template.md) | ADR template |

---

## Audits

| Audit                                                    | Date       | Status |
| -------------------------------------------------------- | ---------- | ------ |
| [Architecture Audit](./audits/architecture-audit-2026-02-04.md) | 2026-02-04 | ✅ Complete |

---

## Maintenance

| Document                     | Purpose                         |
| ---------------------------- | ------------------------------- |
| [CHANGELOG](../CHANGELOG.md) | Version history                 |
| [LEARNINGS](./LEARNINGS.md)  | Gotchas and debugging knowledge |
