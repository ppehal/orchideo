/**
 * TECH_007 - Odrážkování
 *
 * Dimenze:
 * 1. Použití emoji odrážek (EXCELLENT / GOOD / FAIR / POOR)
 *
 * Celkem: 5 kombinací (1 fallback + 4 úrovně)
 */

export const TECH_007_INTRO = `Emoji odrážky jsou mocným nástrojem pro strukturování delších textů na Facebooku.

Co jsou emoji odrážky?
Použití emoji jako odrážek na začátku řádku, např.:
✅ První bod
✅ Druhý bod
✅ Třetí bod

Proč fungují?
- Vizuálně rozbíjejí text
- Usnadňují skenování obsahu
- Přitahují pozornost ke klíčovým bodům
- Zvyšují engagement (lidé je čtou až do konce)

Kdy použít emoji odrážky?
- Výčty benefitů nebo vlastností
- Kroky postupu (1️⃣ 2️⃣ 3️⃣)
- Shrnutí hlavních bodů
- Tipy a doporučení

Ideální je použít emoji odrážky u 30%+ delších textů (100+ znaků).`

export interface CategoryDimension {
  id: string
  label: string
}

export const TECH_007_DIMENSIONS = {
  bulletUsage: [
    { id: 'EXCELLENT', label: 'Vynikající (≥30% s odrážkami)' },
    { id: 'GOOD', label: 'Dobrá (≥20% s odrážkami)' },
    { id: 'FAIR', label: 'Průměrná (≥10% s odrážkami)' },
    { id: 'POOR', label: 'Slabá (<10% s odrážkami)' },
  ] as CategoryDimension[],
}

export const TECH_007_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT:
    'Nemáte dostatek delších textů (100+ znaků) pro analýzu emoji odrážek. Pro přesné vyhodnocení potřebujeme alespoň 3 delší příspěvky.',

  EXCELLENT:
    'Výborně! Více než 30% vašich delších textů využívá emoji odrážky. Vaše příspěvky jsou dobře strukturované a snadno čitelné. Pokračujte v této praxi.',

  GOOD: 'Dobrá práce! 20-30% delších textů má emoji odrážky. Pro další zlepšení zkuste přidat odrážky i do ostatních delších příspěvků - zejména u výčtů a tipů.',

  FAIR: 'Používáte emoji odrážky jen občas (10-20%). Zkuste je využívat častěji - u výčtů, benefitů, kroků postupu. Lidé takto strukturovaný text čtou až do konce.',

  POOR: 'Téměř nepoužíváte emoji odrážky (pod 10%). U delších textů to je promarněná příležitost. Doporučení: Kdykoliv máte výčet nebo seznam bodů, použijte emoji jako odrážky (✅ ➡️ 🔹 apod.).',
}

export function getCategoryKey(totalLongPosts: number, bulletPercentage: number): string {
  if (totalLongPosts < 3) {
    return 'INSUFFICIENT'
  }

  if (bulletPercentage >= 30) {
    return 'EXCELLENT'
  } else if (bulletPercentage >= 20) {
    return 'GOOD'
  } else if (bulletPercentage >= 10) {
    return 'FAIR'
  } else {
    return 'POOR'
  }
}
