/**
 * CONT_002 - Nejsilnější posty
 *
 * Dimenze:
 * 1. Poměr top postů k průměru (LOW / MEDIUM / HIGH / EXCELLENT)
 *
 * + Fallback pro nedostatek příspěvků
 *
 * Celkem: 5 kombinací
 */

export const CONT_002_INTRO = `Analýza vašich nejúspěšnějších příspěvků (top 10%) odhaluje, co u vašeho publika funguje nejlépe. Ideálně by měly mít top příspěvky alespoň 2× vyšší engagement než průměr.

Proč je to důležité?
- Vysoký poměr (3×+) znamená, že máte jasnou strategii pro viral obsah
- Střední poměr (2×) je zdravý standard
- Nízký poměr (<1.5×) může znamenat, že váš obsah je příliš uniformní

Sledujte společné rysy vašich nejlepších příspěvků:
- Jaký formát funguje nejlépe? (foto, video, reel)
- V jakou dobu byly publikovány?
- Jaké téma měly?
- Měly nějaký specifický styl nebo tón?

Tyto poznatky pak aplikujte na budoucí tvorbu obsahu.`

export interface CategoryDimension {
  id: string
  label: string
}

export const CONT_002_DIMENSIONS = {
  topRatio: [
    { id: 'LOW', label: 'Nízký poměr (<1.5×)' },
    { id: 'MEDIUM', label: 'Střední poměr (1.5-2×)' },
    { id: 'HIGH', label: 'Vysoký poměr (2-3×)' },
    { id: 'EXCELLENT', label: 'Vynikající poměr (3×+)' },
  ] as CategoryDimension[],
}

export const CONT_002_MIN_POSTS = 10

export const CONT_002_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT:
    'Nemáte dostatek příspěvků pro analýzu top postů. Potřebujeme alespoň 10 příspěvků za posledních 90 dní.',

  LOW: 'Vaše top příspěvky mají méně než 1.5× vyšší engagement než průměr. To může znamenat dvě věci: buď je váš obsah příliš uniformní (všechno funguje podobně), nebo nemáte jasné "hity". Zkuste experimentovat s různými typy obsahu - emotivnější příspěvky, kontroverzní témata, nebo interaktivní formáty jako ankety.',

  MEDIUM:
    'Vaše top příspěvky mají 1.5-2× vyšší engagement než průměr. To je solidní základ. Analyzujte, co mají vaše nejlepší příspěvky společného a zkuste tyto prvky replikovat častěji. Cílem je dostat se na 2× a výše.',

  HIGH: 'Výborně! Vaše top příspěvky mají 2-3× vyšší engagement než průměr. Máte jasnou představu o tom, co u vašeho publika funguje. Identifikujte společné rysy těchto příspěvků (formát, téma, doba publikace) a využívejte je strategicky.',

  EXCELLENT:
    'Skvělé! Vaše top příspěvky mají více než 3× vyšší engagement než průměr. Máte talent na tvorbu virálního obsahu. Analyzujte, co konkrétně funguje, a vytvořte si "šablonu úspěchu" pro budoucí příspěvky. Tyto top příspěvky jsou také ideálními kandidáty pro placené promování.',
}

/**
 * Určí kategorii na základě poměru top postů k průměru
 */
export function getCategoryKey(totalPosts: number, topToAvgRatio: number): string {
  if (totalPosts < CONT_002_MIN_POSTS) {
    return 'INSUFFICIENT'
  }

  if (topToAvgRatio >= 3) {
    return 'EXCELLENT'
  } else if (topToAvgRatio >= 2) {
    return 'HIGH'
  } else if (topToAvgRatio >= 1.5) {
    return 'MEDIUM'
  } else {
    return 'LOW'
  }
}
