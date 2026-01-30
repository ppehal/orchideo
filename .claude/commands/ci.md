Spusti kompletni CI - vsechny kroky jako v GitHub Actions.

## Kroky

1. **Type check** - `npm run type-check`
2. **Lint** - `npm run lint:ci`
3. **Check formatting** - `npx prettier --check .`
4. **Security audit** - `npm audit --audit-level=high`
5. **Unit tests** - `npm run test:unit`
6. **Build** - `npm run build`

## Postup

Spust kazdy krok postupne. Pri chybe:

- Zobraz konkretni chyby
- Navrhni opravu
- Po oprave pokracuj dalsim krokem

Na konci shrn vysledky vsech kroku.
