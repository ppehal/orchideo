Proved detailni validaci prave vytvoreneho planu pred implementaci.

## Kontext

Tento prikaz spust PO dokonceni planovani, PRED zacatkem implementace.
Cil: odhalit potencialni problemy drive, nez zacnes psat kod.

## Kroky

1. **Rekapitulace planu** - shrn v 3-5 bodech co ma byt implementovano

2. **Funkcni validace**:
   - Je logika planu spravna?
   - Jsou vsechny kroky v logickem poradi?
   - Nechybi nejaky krok?
   - Jsou zavislosti mezi kroky spravne identifikovany?

3. **Edge cases audit**:
   - Null/undefined hodnoty - jak je plan resi?
   - Prazdna data (prazdne pole, prazdny string, 0)
   - Nevalidni vstupy od uzivatele
   - Chybove stavy (API selhani, DB chyba, timeout)
   - Race conditions u async operaci
   - Hranicni hodnoty a limity

4. **Dopad na existujici funkcionalitu**:
   - Projdi soubory ktere budou zmeneny
   - Kde jinde se tento kod pouziva? (grep/references)
   - Mohla by zmena neco rozbyt?
   - Jsou breaking changes? Jak se s nimi plan vypori?

5. **Konzistence s codebase**:
   - Dodrzuje plan existujici patterny? (viz CLAUDE.md)
   - Jsou typy konzistentni s existujicimi?
   - Je naming konzistentni?

6. **Security review**:
   - Validace vstupu na spravnych mistech?
   - SQL injection rizika?
   - XSS rizika?
   - Autorizace - kdo muze tuto akci provest?

7. **Performance uvahy**:
   - Jsou nejake N+1 query rizika?
   - Velke datasety - je plan skalovatelny?
   - Zbytecne re-rendery u React komponent?

## Vystup

### Shrnu vysledky ve formatu:

**✅ Plan je OK** - pokud nenalezeny zadne problemy

nebo

**⚠️ Nalezene problemy:**

1. [Problem 1] - doporucena uprava
2. [Problem 2] - doporucena uprava
   ...

**Doporuceni pro implementaci:**

- [Konkretni tip 1]
- [Konkretni tip 2]

---

Pokud je plan v poradku, potvrd a doporuc pokracovat s implementaci.
Pokud jsou problemy, navrhni upravy planu PRED zacatkem implementace.
