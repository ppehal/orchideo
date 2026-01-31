---
title: 'Learnings & Gotchas'
description: 'Development discoveries, bug fixes, and edge cases for future reference'
status: 'active'
tags: [learnings, debugging, gotchas, reference]
---

# Orchideo - Learnings & Gotchas

> Zjištění z vývoje, oprav a edge cases. Reference pro budoucí debugging.

## Obsah

- [Prisma & Database](#prisma--database)
- [Next.js & React](#nextjs--react)
- [Facebook API](#facebook-api)
- [Auth](#auth)
- [TypeScript](#typescript)

---

## Prisma & Database

_Zatím žádné záznamy._

---

## Next.js & React

### In-memory rate limiter memory leak

**Datum**: 2026-01-31
**Kontext**: Implementace rate limiteru pro PDF export endpoint
**Problém**: In-memory Map pro rate limiting nikdy nemaže staré záznamy
**Příčina**: Rate limiter ukládá `{ count, resetAt }` pro každý token, ale expirované záznamy se nemažou
**Řešení**: Přidána funkce `cleanupExpiredEntries()` volaná při každém requestu, která maže staré záznamy max 1x za hodinu
**Prevence**: Při implementaci in-memory cache/limiterů vždy přidat cleanup mechanismus nebo použít knihovnu s TTL podporou

---

### PDF generation orphan files

**Datum**: 2026-01-31
**Kontext**: PDF generování s cache do filesystem + database
**Problém**: Pokud zápis do DB selže po úspěšném uložení souboru, vznikne orphan file
**Příčina**: Operace nejsou v transakci - soubor se zapíše, ale DB insert selže
**Řešení**: Wrap DB insertu v try-catch, při chybě smazat soubor před rethrow
**Prevence**: Při operacích s externími resources (filesystem, S3) + DB vždy zvážit cleanup při částečném selhání

---

## Facebook API

_Zatím žádné záznamy._

---

## Auth

_Zatím žádné záznamy._

---

## TypeScript

_Zatím žádné záznamy._

---

## Template pro nový záznam

```markdown
### [Název - krátký popis]

**Datum**: YYYY-MM-DD
**Kontext**: Co jsme dělali
**Problém**: Co se stalo
**Příčina**: Proč to bylo
**Řešení**: Jak jsme to vyřešili
**Prevence**: Jak se tomu vyhnout
```
