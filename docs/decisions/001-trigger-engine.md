---
title: 'Trigger Engine Architecture'
description: 'Architecture decision for the Facebook page analysis trigger system'
status: 'accepted'
tags: [adr, triggers, architecture]
---

# ADR-001: Trigger Engine Architecture

**Datum**: 2026-01-30
**Status**: Accepted

## Kontext

Orchideo potřebuje analyzovat Facebook stránky a identifikovat oblasti ke zlepšení. Analýza musí být:

- Rozšiřitelná o nové metriky bez změny core kódu
- Testovatelná izolovaně (každá metrika zvlášť)
- Schopná graceful degradation při chybějících datech
- Kategorizovatelná pro přehledné reporty

Alternativy, které jsme zvažovali:

1. **Monolitická evaluate funkce** - jedna velká funkce s if/else větvemi
2. **Plugin systém** - dynamické načítání modulů za běhu
3. **Registry pattern** - statická registrace pravidel při startu

## Rozhodnutí

Implementujeme **Trigger Engine** založený na registry pattern s následující architekturou:

### Core Components

```
src/lib/triggers/
├── engine.ts      # Orchestrace evaluace
├── registry.ts    # Registr všech triggers
├── types.ts       # TypeScript typy
├── utils.ts       # Pomocné funkce
└── rules/         # Jednotlivá pravidla po kategoriích
    ├── basic/
    ├── content/
    ├── technical/
    ├── timing/
    ├── sharing/
    └── page-settings/
```

### TriggerRule Interface

```typescript
interface TriggerRule {
  id: string // Unique identifier
  name: string // Human-readable name
  description: string // What it measures
  category: TriggerCategory // Grouping
  evaluate: (input: TriggerInput) => TriggerEvaluation // Pure function
}
```

### Design Principles

1. **Pure Functions**: Každý trigger je čistá funkce bez side effects
2. **No Throwing**: Triggery nikdy nevyhazují výjimky, vracejí fallback evaluace
3. **Self-Documenting**: Každý trigger obsahuje name, description, recommendation
4. **Category Weights**: Celkové skóre je vážený průměr kategorií

### Kategorie a Váhy

| Kategorie     | Váha | Popis                                    |
| ------------- | ---- | ---------------------------------------- |
| BASIC         | 35%  | Základní metriky (frekvence, engagement) |
| CONTENT       | 30%  | Kvalita obsahu (délka, média)            |
| TECHNICAL     | 20%  | Technické aspekty (formátování, odkazy)  |
| TIMING        | 5%   | Časování příspěvků                       |
| SHARING       | 5%   | Sdílení a virálnost                      |
| PAGE_SETTINGS | 5%   | Nastavení stránky                        |

### Score Thresholds

- 85-100: EXCELLENT
- 70-84: GOOD
- 40-69: NEEDS_IMPROVEMENT
- 0-39: CRITICAL

## Důsledky

### Pozitivní

- **Testovatelnost**: Každý trigger lze testovat izolovaně
- **Rozšiřitelnost**: Nový trigger = nový soubor v rules/, registrace v index.ts
- **Přehlednost**: Jasná struktura, snadná navigace
- **Type Safety**: Plná podpora TypeScript, compile-time kontroly
- **Graceful Degradation**: Fallback evaluace při chybějících datech
- **Parallel Development**: Vývojáři mohou pracovat na různých triggerech nezávisle

### Negativní

- **Boilerplate**: Každý trigger vyžaduje registraci
- **Memory**: Všechny triggery jsou načtené v paměti při startu
- **Coupling**: TriggerInput musí obsahovat všechna data pro všechny triggery

### Mitigace

- **Boilerplate**: Generátor/template pro nové triggery
- **Memory**: Akceptovatelné pro ~50 triggerů (měřeno <1MB)
- **Coupling**: Lazy loading insights jen když je trigger potřebuje

## Reference

- `src/lib/triggers/` - Implementace
- `tests/unit/triggers/` - Testy
- `docs/systems/trigger-engine.md` - Detailní dokumentace (TODO)
