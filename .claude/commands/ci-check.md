Spusti CI check - simuluje prvni cast CI workflow (job "check").

## Kroky

1. **Type check** - `npm run type-check`
2. **Lint** - `npm run lint:ci` (max-warnings 0)
3. **Check formatting** - `npx prettier --check .`
4. **Security audit** - `npm audit --audit-level=high`

## Postup

Spust kazdy krok postupne. Pri chybe:

- Zobraz konkretni chyby
- Navrhni opravu
- Pokracuj dalsim krokem az po dokonceni opravy

Na konci shrn vysledky vsech kroku.
