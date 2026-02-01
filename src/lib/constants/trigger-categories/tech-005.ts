/**
 * TECH_005 - Odkazy v textu
 *
 * Dimenze:
 * 1. Množství inline odkazů (EXCELLENT / GOOD / FAIR / POOR)
 * Nižší je lepší - inline odkazy jsou špatná praxe
 *
 * Celkem: 5 kombinací (1 fallback + 4 úrovně)
 */

export const TECH_005_INTRO = `Odkazy přímo v textu příspěvku (inline links) jsou na Facebooku špatnou praxí.

Proč se vyhýbat inline odkazům?
- Facebook zkracuje dlouhé URL, které pak vypadají neprofesionálně
- Algoritmus penalizuje příspěvky s odkazy (snižuje reach)
- Narušují plynulost čtení textu
- Obtížně klikatelné na mobilu

Co místo toho?
- **Link post**: Sdílejte odkaz jako formát příspěvku (s náhledem)
- **Odkaz v komentáři**: Napište text, publikujte, pak přidejte odkaz jako první komentář
- **Bitly/zkracovače**: Pokud musíte mít odkaz v textu, použijte zkrácenou verzi

Platí zejména pro organické příspěvky. U reklam je situace jiná.`

export interface CategoryDimension {
  id: string
  label: string
}

export const TECH_005_DIMENSIONS = {
  inlineLinkLevel: [
    { id: 'EXCELLENT', label: 'Vynikající (≤5% s odkazy)' },
    { id: 'GOOD', label: 'Dobrá (≤15% s odkazy)' },
    { id: 'FAIR', label: 'Průměrná (≤30% s odkazy)' },
    { id: 'POOR', label: 'Slabá (>30% s odkazy)' },
  ] as CategoryDimension[],
}

export const TECH_005_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT:
    'Nemáte dostatek příspěvků s textem pro analýzu. Pro přesné vyhodnocení potřebujeme alespoň 5 příspěvků.',

  EXCELLENT:
    'Výborně! Téměř nepoužíváte inline odkazy (≤5%). Vaše příspěvky nejsou penalizovány algoritmem kvůli odkazům. Pokračujte v používání link postů nebo odkazů v komentářích.',

  GOOD: 'Dobrá práce! Máte jen málo inline odkazů (≤15%). Pro další zlepšení zkuste přesunout zbývající odkazy do komentářů nebo použít formát link post.',

  FAIR: 'Část vašich příspěvků obsahuje inline odkazy (do 30%). Tyto příspěvky mají pravděpodobně nižší organický dosah. Zkuste přesunout odkazy do prvního komentáře nebo použít link post formát.',

  POOR: 'Více než 30% vašich příspěvků obsahuje inline odkazy. To výrazně snižuje váš organický dosah. Doporučení: Přestaňte vkládat odkazy do textu. Použijte link post (odkaz jako formát) nebo dejte odkaz do prvního komentáře.',
}

export function getCategoryKey(totalPosts: number, inlineLinkPercentage: number): string {
  if (totalPosts < 5) {
    return 'INSUFFICIENT'
  }

  if (inlineLinkPercentage <= 5) {
    return 'EXCELLENT'
  } else if (inlineLinkPercentage <= 15) {
    return 'GOOD'
  } else if (inlineLinkPercentage <= 30) {
    return 'FAIR'
  } else {
    return 'POOR'
  }
}
