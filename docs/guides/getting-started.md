# Getting Started

> Quick setup guide for Orchideo development.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

## Setup

### 1. Clone repository

```bash
git clone https://github.com/ppehal/orchideo.git
cd orchideo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment setup

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 4. Start database

```bash
docker compose up -d postgres
```

### 5. Initialize database

```bash
npm run db:push
npm run db:seed
```

### 6. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See [Environment Variables](../reference/env-variables.md) for full list.

Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Auth.js secret
- `FACEBOOK_APP_ID` - Facebook App ID
- `FACEBOOK_APP_SECRET` - Facebook App Secret

## Next Steps

- [Architecture](../ARCHITECTURE.md) - Understand the system
- [Tech Context](../tech-context.md) - Coding patterns
