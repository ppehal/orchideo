/**
 * TECH_003 - Délka textů
 *
 * Dimenze:
 * 1. Rozložení délek (BALANCED / TOO_SHORT / TOO_LONG / UNBALANCED)
 *
 * Celkem: 5 kombinací (1 fallback + 4 kategorie)
 */

export const TECH_003_INTRO = `Délka textu příspěvku ovlivňuje jeho engagement. Různé délky fungují pro různé účely:

**Krátké texty (do 80 znaků):**
- Rychle čitelné, vhodné pro jednoduché sdělení
- Dobré pro vizuálně silné příspěvky
- Riziko: příliš stručné, chybí kontext

**Střední texty (80-200 znaků):**
- Optimální délka pro většinu příspěvků
- Dostatek prostoru pro sdělení + call-to-action
- Nezahlcují, ale přinášejí hodnotu

**Dlouhé texty (200+ znaků):**
- Vhodné pro příběhy, edukativní obsah
- Vyžadují strukturu (odstavce, emoji odrážky)
- Riziko: nízký dočtení rate

Ideální mix: ~30% krátkých, ~50% středních, ~20% dlouhých.`

export interface CategoryDimension {
  id: string
  label: string
}

export const TECH_003_DIMENSIONS = {
  distribution: [
    { id: 'BALANCED', label: 'Vyvážené rozložení' },
    { id: 'TOO_SHORT', label: 'Příliš krátké texty' },
    { id: 'TOO_LONG', label: 'Příliš dlouhé texty' },
    { id: 'UNBALANCED', label: 'Nevyvážené rozložení' },
  ] as CategoryDimension[],
}

export const TECH_003_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT:
    'Nemáte dostatek příspěvků s textem pro analýzu. Pro přesné vyhodnocení potřebujeme alespoň 5 příspěvků.',

  BALANCED:
    'Výborně! Máte vyvážené rozložení délek textů. Střídáte krátké, střední a delší příspěvky, což udržuje pestrost vašeho obsahu. Pokračujte v tomto přístupu.',

  TOO_SHORT:
    'Většina vašich textů je příliš krátká (pod 80 znaků). Krátké texty jsou sice snadno čitelné, ale často neposkytují dostatečný kontext nebo hodnotu. Zkuste přidat více středně dlouhých textů s jasným sdělením a call-to-action.',

  TOO_LONG:
    'Většina vašich textů je příliš dlouhá (nad 200 znaků). Dlouhé texty mají nižší míru dočtení. Zkuste je zkrátit nebo alespoň lépe strukturovat pomocí odstavců a emoji odrážek. Pro důležité informace použijte střední délku.',

  UNBALANCED:
    'Rozložení délek vašich textů není optimální. Doporučený mix: ~30% krátkých (do 80 znaků), ~50% středních (80-200), ~20% dlouhých (200+). Experimentujte s různými délkami pro různé typy obsahu.',
}

export function getCategoryKey(
  totalPosts: number,
  shortPct: number,
  longPct: number,
  avgDeviation: number
): string {
  if (totalPosts < 5) {
    return 'INSUFFICIENT'
  }

  if (avgDeviation <= 20) {
    return 'BALANCED'
  } else if (shortPct > 70) {
    return 'TOO_SHORT'
  } else if (longPct > 50) {
    return 'TOO_LONG'
  } else {
    return 'UNBALANCED'
  }
}
