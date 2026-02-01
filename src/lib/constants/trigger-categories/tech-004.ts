/**
 * TECH_004 - Práce s odstavci
 *
 * Dimenze:
 * 1. Použití odstavců (EXCELLENT / GOOD / FAIR / POOR)
 *
 * Celkem: 5 kombinací (1 fallback + 4 úrovně)
 */

export const TECH_004_INTRO = `Odstavce (dvojité zalomení řádku) dramaticky zlepšují čitelnost delších textů na Facebooku.

Proč používat odstavce?
- Delší texty bez odstavců vypadají jako "zeď textu"
- Uživatelé přeskakují dlouhé nestrukturované texty
- Odstavce umožňují skenovat text očima
- Každý odstavec = jedna myšlenka

Kdy použít odstavce?
- U všech textů delších než 100 znaků
- Mezi různými myšlenkami nebo body
- Před a po důležité informaci nebo CTA

Tip: Na Facebooku použijte dvojité Enter pro vytvoření viditelného odstavce.`

export interface CategoryDimension {
  id: string
  label: string
}

export const TECH_004_DIMENSIONS = {
  paragraphUsage: [
    { id: 'EXCELLENT', label: 'Vynikající (≥80% s odstavci)' },
    { id: 'GOOD', label: 'Dobrá (≥60% s odstavci)' },
    { id: 'FAIR', label: 'Průměrná (≥40% s odstavci)' },
    { id: 'POOR', label: 'Slabá (<40% s odstavci)' },
  ] as CategoryDimension[],
}

export const TECH_004_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT:
    'Nemáte dostatek delších textů (100+ znaků) pro analýzu odstavců. Pro přesné vyhodnocení potřebujeme alespoň 3 delší příspěvky.',

  EXCELLENT:
    'Výborně! Více než 80% vašich delších textů používá odstavce. Vaše texty jsou dobře strukturované a snadno čitelné. Pokračujte v této praxi.',

  GOOD: 'Dobrá práce! Více než 60% delších textů má odstavce. Pro další zlepšení se snažte strukturovat všechny texty nad 100 znaků - oddělujte myšlenky prázdným řádkem.',

  FAIR: 'Část vašich delších textů postrádá odstavce. Nestrukturované texty mají nižší dočtění. Doporučení: U každého textu nad 100 znaků použijte alespoň jeden prázdný řádek mezi myšlenkami.',

  POOR: 'Většina vašich delších textů nemá odstavce. Takové "zdi textu" lidé přeskakují. Začněte strukturovat své texty - každá nová myšlenka = nový odstavec. Stačí použít dvojité Enter.',
}

export function getCategoryKey(totalLongPosts: number, paragraphPercentage: number): string {
  if (totalLongPosts < 3) {
    return 'INSUFFICIENT'
  }

  if (paragraphPercentage >= 80) {
    return 'EXCELLENT'
  } else if (paragraphPercentage >= 60) {
    return 'GOOD'
  } else if (paragraphPercentage >= 40) {
    return 'FAIR'
  } else {
    return 'POOR'
  }
}
