/**
 * SHARE_001 - Shared Posts category definitions
 *
 * Analyzes the ratio of shared vs. original content.
 * Lower percentage of shared content is better.
 */

import type { CategoryDimension } from './basic-001'

export const SHARE_001_INTRO = `Algoritmus Facebooku výrazně preferuje originální obsah před sdíleným. Sdílení cizího obsahu sice může doplnit váš content mix, ale příliš mnoho sdíleného obsahu signalizuje, že vaše stránka nepřináší vlastní hodnotu.

Ideální poměr je maximálně 20% sdíleného obsahu. Originální příspěvky mají typicky vyšší dosah, protože Facebook chce uživatelům ukazovat unikátní obsah, ne ten samý příspěvek opakovaně. Pokud sdílíte zajímavý obsah, zvažte jeho přeformulování do vlastního příspěvku s přidanou hodnotou.`

export const SHARE_001_DIMENSIONS = {
  sharedRatio: [
    { id: 'EXCELLENT', label: '≤10% sdíleného obsahu', max: 10 },
    { id: 'GOOD', label: '11-20% sdíleného obsahu', min: 11, max: 20 },
    { id: 'ACCEPTABLE', label: '21-30% sdíleného obsahu', min: 21, max: 30 },
    { id: 'HIGH', label: '31-50% sdíleného obsahu', min: 31, max: 50 },
    { id: 'VERY_HIGH', label: '>50% sdíleného obsahu', min: 51 },
  ] as CategoryDimension[],
}

export const SHARE_001_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT_DATA:
    'Pro analýzu poměru originálního a sdíleného obsahu potřebujeme alespoň 10 příspěvků. Pokračujte v publikování a vraťte se k analýze.',

  EXCELLENT:
    'Výborně! Váš obsah je téměř výhradně originální, což Facebook algoritmus oceňuje. Sdílený obsah tvoří pouze zlomek vašeho content mixu. Pokračujte v této strategii - originální obsah má vždy lepší dosah.',

  GOOD: 'Dobrý poměr! Sdílený obsah tvoří rozumnou část vašeho mixu. Toto je zdravá rovnováha mezi vlastní tvorbou a kurátorstvím zajímavého obsahu. Hlídejte, aby podíl nepřekročil 20%.',

  ACCEPTABLE:
    'Sdíleného obsahu je trochu více než ideální. Zkuste více tvořit vlastní příspěvky inspirované tím, co sdílíte. Přidejte vlastní komentář, pohled nebo přepracujte cizí obsah do originálního formátu.',

  HIGH: 'Příliš mnoho sdíleného obsahu! Toto výrazně snižuje váš organický dosah. Facebook penalizuje stránky, které primárně šíří cizí obsah. Zaměřte se na vlastní tvorbu - i jednoduchý originální příspěvek má vyšší hodnotu než sdílení.',

  VERY_HIGH:
    'Většina vašeho obsahu je sdílená z jiných zdrojů. To je velký problém pro algoritmus - vaše stránka vypadá jako agregátor, ne jako zdroj hodnoty. Dramaticky snižte sdílení a začněte vytvářet vlastní obsah. Každý originální příspěvek má násobně vyšší potenciál dosahu.',
}

export function getCategoryKey(postsCount: number, sharedPct: number): string {
  if (postsCount < 10) {
    return 'INSUFFICIENT_DATA'
  }

  const category = SHARE_001_DIMENSIONS.sharedRatio.find(
    (d) =>
      (d.min === undefined || sharedPct >= d.min) && (d.max === undefined || sharedPct <= d.max)
  )

  return category?.id ?? 'VERY_HIGH'
}
