/**
 * TECH_001 - Velikosti vizuálů
 *
 * Dimenze:
 * 1. Kvalita rozměrů (EXCELLENT / GOOD / FAIR / POOR)
 *
 * Celkem: 5 kombinací (1 fallback + 4 úrovně)
 */

export const TECH_001_INTRO = `Facebook zobrazuje obrázky v různých velikostech podle zařízení a umístění. Pro optimální zobrazení v news feedu je ideální rozměr 1080×1350 pixelů (poměr stran 4:5).

Proč je rozměr důležitý?
- Obrázky v ideálním rozměru zabírají více místa ve feedu = větší viditelnost
- Poměr 4:5 je optimální pro mobilní zařízení, kde většina uživatelů Facebook prohlíží
- Příliš malé obrázky se roztahují a ztrácí kvalitu
- Příliš velké obrázky se komprimují a mohou ztrácet detail

Tip: Připravujte grafiku vždy v rozměru 1080×1350px nebo alespoň zachovávejte poměr stran 4:5.`

export interface CategoryDimension {
  id: string
  label: string
}

export const TECH_001_DIMENSIONS = {
  qualityLevel: [
    { id: 'EXCELLENT', label: 'Vynikající (≥80% ideálních)' },
    { id: 'GOOD', label: 'Dobrá (≥50% ideálních)' },
    { id: 'FAIR', label: 'Průměrná (≥40% dobrých)' },
    { id: 'POOR', label: 'Slabá (<40% dobrých)' },
  ] as CategoryDimension[],
}

export const TECH_001_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT:
    'Nemáte dostatek obrázků s dostupnými rozměry pro analýzu. Pro přesné vyhodnocení potřebujeme alespoň 3 obrázky.',

  EXCELLENT:
    'Výborně! Více než 80% vašich obrázků má ideální rozměry 1080×1350px. Pokračujte v této praxi - vaše obrázky se zobrazují optimálně na všech zařízeních.',

  GOOD: 'Dobrá práce! Více než 50% obrázků má ideální rozměry. Pro další zlepšení se snažte používat rozměr 1080×1350px u všech grafik. Můžete si vytvořit šablonu v Canva nebo jiném nástroji.',

  FAIR: 'Vaše obrázky mají většinou správný poměr stran (4:5), ale ne vždy ideální rozlišení. Snažte se používat rozměr 1080×1350px pro nejlepší zobrazení. Vyšší rozlišení = lepší kvalita po kompresi.',

  POOR: 'Většina vašich obrázků nemá optimální rozměry. To může snižovat jejich vizuální dopad ve feedu. Doporučení: Používejte rozměr 1080×1350px (poměr 4:5) pro všechny grafiky určené do feedu.',
}

export function getCategoryKey(
  totalAnalyzed: number,
  idealPercentage: number,
  goodPercentage: number
): string {
  if (totalAnalyzed < 3) {
    return 'INSUFFICIENT'
  }

  if (idealPercentage >= 80) {
    return 'EXCELLENT'
  } else if (idealPercentage >= 50) {
    return 'GOOD'
  } else if (goodPercentage >= 40) {
    return 'FAIR'
  } else {
    return 'POOR'
  }
}
