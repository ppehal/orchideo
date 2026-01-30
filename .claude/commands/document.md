Proved manualni dokumentaci posledni zmeny.

## Postup

1. **Analyzuj posledni zmenu** v git diff nebo posledni provedenou akci

2. **Aktualizuj CHANGELOG.md**:
   - Pridej zaznam do `## [Unreleased]` sekce
   - Format: `- [Added/Changed/Fixed]: Strucny popis`

3. **Rozhodnu o dalsich docs**:

   **docs/LEARNINGS.md** - pridej pokud:
   - Slo o bug s neocekavanou pricinou
   - Objevil se edge case
   - Je tu gotcha pro budoucnost

   **docs/decisions/NNN-\*.md** - vytvor pokud:
   - Slo o vyber technologie
   - Architekturni rozhodnuti
   - Zmena pristupu

   **docs/ARCHITECTURE.md** - aktualizuj pokud:
   - Zmena struktury projektu
   - Nove datove toky
   - Zmena API

4. **Potvrd** co bylo zdokumentovano

## Format LEARNINGS zaznamu

```markdown
### [Nazev - kratky popis]

**Datum**: YYYY-MM-DD
**Kontext**: Co jsme delali
**Problem**: Co se stalo
**Pricina**: Proc to bylo
**Reseni**: Jak jsme to vyresili
**Prevence**: Jak se tomu vyhnout
```

## Format ADR

Pouzij sablonu z `docs/decisions/000-template.md`
Cislo = posledni existujici + 1
