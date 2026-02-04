# Orchideo - Facebook Triggers

> **Nástroj pro analýzu Facebook stránek a generování AI doporučení**

Orchideo analyzuje Facebook stránky pomocí 27+ triggerů (pravidel) a poskytuje personalizovaná doporučení pro zlepšení engagement a růstu stránky.

## 🚀 Quick Start

### Lokální Development

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Setup database
npm run db:push
npm run db:seed

# 4. Start development server
npm run dev
```

Otevřít [http://localhost:3000](http://localhost:3000)

### VPS Development (stage)

```bash
# Start containers
./QUICK-START.sh start

# View logs
./QUICK-START.sh logs

# Check status
./QUICK-START.sh status
```

Více v [VPS-SETUP-COMPLETE.md](./VPS-SETUP-COMPLETE.md)

## 📚 Dokumentace

- **[CLAUDE.md](./CLAUDE.md)** - Quick reference pro coding standards
- **[docs/](./docs/)** - Detailní dokumentace (architecture, guides, reference)
- **[CHANGELOG.md](./CHANGELOG.md)** - Historie změn

### Klíčové dokumenty

- [Getting Started](./docs/guides/getting-started.md) - Detailní setup guide
- [Tech Stack](./docs/tech-context.md) - Technologický kontext
- [Architecture](./docs/ARCHITECTURE.md) - Architektura systému
- [Deployment](./docs/guides/deployment.md) - Deployment pokyny

## 🛠️ Tech Stack

| Technology | Version |
| ---------- | ------- |
| Next.js    | 16.x    |
| React      | 19.x    |
| TypeScript | 5.x     |
| Prisma     | 6.x     |
| PostgreSQL | 17.x    |
| NextAuth   | 5.x     |
| Tailwind   | 4.x     |

## 🔧 Development Commands

```bash
npm run dev              # Dev server
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # TypeScript check
npm run db:studio        # Prisma Studio
npm run db:push          # Push schema changes
npm run db:seed          # Seed database
```

## 🌿 Git Workflow

```
feature-branch → stage → (PR) → main
```

⚠️ **PUSH POUZE DO `stage`** - nikdy přímo do `main`

```bash
git push origin stage    # ✅ ALLOWED
git push origin main     # ❌ FORBIDDEN
```

## 📄 License

Proprietary - Orchideo Project

## 🤝 Contributing

Viz [CLAUDE.md](./CLAUDE.md) pro coding standards a workflow pravidla.
