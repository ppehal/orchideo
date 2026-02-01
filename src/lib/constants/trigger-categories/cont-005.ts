/**
 * CONT_005 - Formáty příspěvků
 *
 * Dimenze:
 * 1. Diverzita formátů (LOW / MEDIUM / HIGH)
 * 2. Balance formátů (UNBALANCED / BALANCED)
 *
 * + Fallback pro nedostatek příspěvků
 *
 * Celkem: 7 kombinací
 */

export const CONT_005_INTRO = `Různé formáty příspěvků mají různý potenciál pro engagement. Facebook algoritmus upřednostňuje rozmanitý obsah a nativní formáty (zejména video a Reels).

Ideální rozložení formátů:
- **Fotky: 40-60%** - základ vizuálního obsahu
- **Video/Reels: 20-40%** - nejvyšší engagement potenciál
- **Odkazy: 10-20%** - pro návštěvnost webu
- **Text (status): <10%** - nejnižší dosah
- **Sdílené: <10%** - nízký organický dosah

Proč je diverzita důležitá?
- Různé formáty oslovují různé segmenty publika
- Algoritmus oceňuje kreativitu a rozmanitost
- Některé formáty fungují lépe pro různé cíle (engagement vs. návštěvnost)

Používejte alespoň 3-4 různé formáty pro optimální výsledky.`

export interface CategoryDimension {
  id: string
  label: string
}

export const CONT_005_DIMENSIONS = {
  diversity: [
    { id: 'LOW', label: 'Nízká diverzita (1-2 formáty)' },
    { id: 'MEDIUM', label: 'Střední diverzita (3-4 formáty)' },
    { id: 'HIGH', label: 'Vysoká diverzita (5+ formátů)' },
  ] as CategoryDimension[],
  balance: [
    { id: 'UNBALANCED', label: 'Nevyvážené rozložení' },
    { id: 'BALANCED', label: 'Vyvážené rozložení' },
  ] as CategoryDimension[],
}

export const CONT_005_MIN_POSTS = 10

export const CONT_005_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT:
    'Nemáte dostatek příspěvků pro analýzu formátů. Potřebujeme alespoň 10 příspěvků za posledních 90 dní.',

  // LOW diversity
  LOW_UNBALANCED:
    'Používáte jen 1-2 formáty a máte nevyvážené rozložení. To výrazně omezuje váš potenciální dosah. Začněte experimentovat s dalšími formáty - pokud děláte jen fotky, zkuste video nebo Reels. Pokud děláte jen odkazy, přidejte vizuální obsah.',

  LOW_BALANCED:
    'Používáte jen 1-2 formáty, ale máte alespoň vyvážené rozložení. Přidejte další formáty do svého mixu. Zejména zvažte video obsah a Reels, které mají nejvyšší potenciál pro organický dosah.',

  // MEDIUM diversity
  MEDIUM_UNBALANCED:
    'Používáte 3-4 formáty, což je dobré, ale rozložení není optimální. Zkontrolujte, zda nemáte příliš mnoho jednoho typu (>70% foto) nebo příliš málo video obsahu (<10%). Upravte poměry pro lepší výsledky.',

  MEDIUM_BALANCED:
    'Dobrá práce! Používáte 3-4 formáty s vyváženým rozložením. Pro další zlepšení zvažte přidání formátů, které ještě nepoužíváte. Zejména Reels mají aktuálně nejvyšší organický dosah.',

  // HIGH diversity
  HIGH_UNBALANCED:
    'Používáte mnoho různých formátů (5+), což je skvělé pro diverzitu. Ale rozložení není optimální - některé formáty jsou zastoupeny příliš nebo příliš málo. Zaměřte se na vyvážení mixu.',

  HIGH_BALANCED:
    'Výborně! Používáte širokou škálu formátů (5+) s vyváženým rozložením. Máte optimální obsahovou strategii z hlediska formátů. Sledujte, které formáty přinášejí nejlepší výsledky pro vaše konkrétní cíle.',
}

/**
 * Určí kategorii na základě diverzity a balance formátů
 */
export function getCategoryKey(
  totalPosts: number,
  activeFormats: number,
  isBalanced: boolean
): string {
  if (totalPosts < CONT_005_MIN_POSTS) {
    return 'INSUFFICIENT'
  }

  let diversityCategory: string
  if (activeFormats >= 5) {
    diversityCategory = 'HIGH'
  } else if (activeFormats >= 3) {
    diversityCategory = 'MEDIUM'
  } else {
    diversityCategory = 'LOW'
  }

  const balanceCategory = isBalanced ? 'BALANCED' : 'UNBALANCED'

  return `${diversityCategory}_${balanceCategory}`
}

/**
 * Určí, zda je mix formátů vyvážený
 */
export function isFormatBalanced(
  photoPct: number,
  videoPct: number,
  sharedPct: number,
  statusPct: number
): boolean {
  // Balanced means:
  // - Photo not over 70%
  // - Video at least 5% (if posting regularly)
  // - Shared under 20%
  // - Status under 20%
  return photoPct <= 70 && videoPct >= 5 && sharedPct <= 20 && statusPct <= 20
}
