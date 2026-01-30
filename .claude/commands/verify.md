Proved detailni overeni prave dokoncene implementace.

## Kroky

1. **Identifikuj implementaci** - zjisti co bylo prave implementovano (git diff, posledni akce)

2. **Analyzuj edge cases**:
   - Null/undefined hodnoty
   - Prazdne pole/objekty
   - Hranicni hodnoty (0, -1, MAX_INT)
   - Nevalidni vstupy
   - Race conditions (async operace)
   - Chybove stavy

3. **Over typy**:
   - Spust `npm run type-check`
   - Zkontroluj nullable typy
   - Over genericke typy

4. **Testuj manualne** (pokud mozno):
   - Spust jednotkove testy pro zmenenou cast
   - Navrhni chybejici testy pro edge cases

5. **Zkontroluj integrace**:
   - Kde vsude se zmeneny kod pouziva?
   - Mohla zmena neco rozbyt?

6. **Security check**:
   - SQL injection rizika
   - XSS rizika
   - Validace vstupu

## Vystup

Shrn nalezene problemy a navrhni opravy. Pokud je vse OK, potvrdi.
