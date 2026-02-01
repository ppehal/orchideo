/**
 * CONT_003 - Nejslabší posty
 *
 * Dimenze:
 * 1. Poměr slabých postů k průměru (VERY_BAD / BAD / MEDIUM / GOOD)
 *
 * + Fallback pro nedostatek příspěvků
 *
 * Celkem: 5 kombinací
 */

export const CONT_003_INTRO = `Analýza vašich nejslabších příspěvků (bottom 10%) je stejně důležitá jako analýza těch nejlepších. Ideálně by měly mít i slabé příspěvky alespoň 50% průměrného engagementu.

Proč sledovat slabé příspěvky?
- Pomáhá identifikovat, co NEFUNGUJE
- Odhaluje vzorce, kterým se vyhnout
- Šetří čas a zdroje na tvorbu neefektivního obsahu

Typické příčiny slabých příspěvků:
- Sdílený obsah místo originálního
- Odkazy v textu (snižují dosah)
- Příliš prodejní tón
- Špatné načasování publikace
- Nekvalitní vizuály nebo žádné vizuály

Analyzujte společné rysy vašich nejslabších příspěvků a těmto vzorcům se v budoucnu vyhněte.`

export interface CategoryDimension {
  id: string
  label: string
}

export const CONT_003_DIMENSIONS = {
  bottomRatio: [
    { id: 'VERY_BAD', label: 'Velmi slabé (<15% průměru)' },
    { id: 'BAD', label: 'Slabé (15-30% průměru)' },
    { id: 'MEDIUM', label: 'Akceptovatelné (30-50% průměru)' },
    { id: 'GOOD', label: 'Dobré (≥50% průměru)' },
  ] as CategoryDimension[],
}

export const CONT_003_MIN_POSTS = 10

export const CONT_003_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT:
    'Nemáte dostatek příspěvků pro analýzu slabých postů. Potřebujeme alespoň 10 příspěvků za posledních 90 dní.',

  VERY_BAD:
    'Vaše nejslabší příspěvky mají méně než 15% průměrného engagementu. To je velmi velký propad. Analyzujte, co mají tyto příspěvky společného - pravděpodobně obsahují některé z těchto problémů: sdílený obsah, odkazy v textu, příliš prodejní tón, nebo publikace v nevhodnou dobu. Tyto vzorce eliminujte z vaší obsahové strategie.',

  BAD: 'Vaše nejslabší příspěvky mají 15-30% průměrného engagementu. Stále je to velký rozdíl. Podívejte se na konkrétní příspěvky a identifikujte, proč selhaly. Často jde o kombinaci faktorů - špatný formát pro dané téma, nevhodné načasování, nebo nezajímavý úhel.',

  MEDIUM:
    'Vaše nejslabší příspěvky mají 30-50% průměrného engagementu. To je akceptovatelné, ale stále je prostor pro zlepšení. Zaměřte se na konzistenci kvality - snažte se, aby i vaše "slabší" příspěvky měly alespoň základní engagement.',

  GOOD: 'Výborně! I vaše nejslabší příspěvky mají alespoň 50% průměrného engagementu. To znamená vysokou konzistenci kvality vašeho obsahu. Nemáte velké výkyvy a váš obsah funguje relativně spolehlivě. Pokračujte v této kvalitě.',
}

/**
 * Určí kategorii na základě poměru slabých postů k průměru
 */
export function getCategoryKey(totalPosts: number, bottomToAvgRatio: number): string {
  if (totalPosts < CONT_003_MIN_POSTS) {
    return 'INSUFFICIENT'
  }

  if (bottomToAvgRatio >= 0.5) {
    return 'GOOD'
  } else if (bottomToAvgRatio >= 0.3) {
    return 'MEDIUM'
  } else if (bottomToAvgRatio >= 0.15) {
    return 'BAD'
  } else {
    return 'VERY_BAD'
  }
}
