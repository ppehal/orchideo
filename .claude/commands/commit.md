Vytvor git commit se staged zmenami.

## Kroky

1. **Zkontroluj staged zmeny**
   - Spust `git diff --staged`
   - Pokud nic staged, zobraz `git status` a skonci

2. **Zkontroluj problemy ve staged kodu**
   - TODO komentare
   - Hardcoded values (API keys, URLs, credentials)
   - Debug kod (console.log, debugger, commented code)
   - Pokud najdes problem, upozorni a zeptej se zda pokracovat

3. **Vytvor commit message**
   - Format: `type(scope): popis` (max 72 znaku)
   - Typy: feat, fix, refactor, docs, chore, test
   - Scope = hlavni zmeneny modul/oblast
   - Popis v cestine, strucny a vystizny

4. **Proved commit**
   - `git commit -m "message"`
   - Zobraz vysledek

## Argumenty

$ARGUMENTS je volitelna commit message. Pokud:

- Prazdna: analyzuj zmeny a navrhni message
- Zadana: pouzij ji (zkontroluj format)

## Priklady

```
feat(analysis): pridani FB page analyzeru
fix(triggers): oprava evaluace pravidel
refactor(api): presun logiky do service vrstvy
docs(readme): aktualizace instalacnich kroku
chore(deps): aktualizace prisma na 6.x
test(auth): pridani testu pro login flow
```
