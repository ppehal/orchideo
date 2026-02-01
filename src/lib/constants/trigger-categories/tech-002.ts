/**
 * TECH_002 - Typ souboru
 *
 * Dimenze:
 * 1. Kvalita formátů (EXCELLENT / GOOD / FAIR / POOR)
 *
 * Celkem: 5 kombinací (1 fallback + 4 úrovně)
 */

export const TECH_002_INTRO = `Formát obrázku ovlivňuje jeho kvalitu a velikost. Pro Facebook jsou optimální formáty PNG a JPEG.

Kdy použít který formát?
- **PNG**: Grafiky s textem, loga, ilustrace, screenshoty - zachovává ostré hrany
- **JPEG**: Fotografie, obrázky s plynulými přechody - menší velikost souboru

Proč je formát důležitý?
- Správný formát = lepší kvalita po kompresi Facebookem
- PNG pro text zabraňuje rozmazání písma
- JPEG pro fotky umožňuje menší soubory bez viditelné ztráty kvality

Vyhněte se: GIF pro statické obrázky, BMP, TIFF a jiným newebovým formátům.`

export interface CategoryDimension {
  id: string
  label: string
}

export const TECH_002_DIMENSIONS = {
  formatQuality: [
    { id: 'EXCELLENT', label: 'Vynikající (≥90% PNG/JPEG)' },
    { id: 'GOOD', label: 'Dobrá (≥80% PNG/JPEG)' },
    { id: 'FAIR', label: 'Průměrná (≥60% PNG/JPEG)' },
    { id: 'POOR', label: 'Slabá (<60% PNG/JPEG)' },
  ] as CategoryDimension[],
}

export const TECH_002_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT:
    'Nemáte dostatek obrázků s dostupným formátem pro analýzu. Pro přesné vyhodnocení potřebujeme alespoň 3 obrázky.',

  EXCELLENT:
    'Výborně! Více než 90% vašich obrázků používá optimální formáty (PNG/JPEG). Vaše obrázky se zobrazují v nejlepší možné kvalitě.',

  GOOD: 'Dobrá práce! Více než 80% obrázků používá správné formáty. Pro perfektní výsledek se snažte používat PNG pro grafiky s textem a JPEG pro fotografie.',

  FAIR: 'Část vašich obrázků používá neoptimální formáty. Doporučení: PNG pro grafiky s textem a logy, JPEG pro fotografie. Vyhněte se GIF pro statické obrázky.',

  POOR: 'Většina vašich obrázků používá neoptimální formáty. To může negativně ovlivnit jejich kvalitu. Přejděte na PNG (grafiky) nebo JPEG (fotky) pro lepší výsledky.',
}

export function getCategoryKey(totalAnalyzed: number, goodPercentage: number): string {
  if (totalAnalyzed < 3) {
    return 'INSUFFICIENT'
  }

  if (goodPercentage >= 90) {
    return 'EXCELLENT'
  } else if (goodPercentage >= 80) {
    return 'GOOD'
  } else if (goodPercentage >= 60) {
    return 'FAIR'
  } else {
    return 'POOR'
  }
}
