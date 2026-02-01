/**
 * SHARE_004 - UTM Parameters category definitions
 *
 * Analyzes usage of UTM tracking parameters on links.
 * Higher usage enables better marketing measurement.
 */

import type { CategoryDimension } from './basic-001'

export const SHARE_004_INTRO = `UTM parametry jsou značky přidané k URL adresám, které umožňují sledovat, odkud návštěvníci přicházejí na váš web. Díky nim můžete v Google Analytics (nebo jiném nástroji) přesně vidět, které Facebook příspěvky přivádějí nejvíce návštěvníků a konverzí.

Standardní UTM parametry jsou: utm_source (facebook), utm_medium (social/organic/paid), utm_campaign (název kampaně) a volitelně utm_content (varianta příspěvku). Bez UTM parametrů je obtížné měřit skutečnou efektivitu vašeho Facebook marketingu.`

export const SHARE_004_DIMENSIONS = {
  utmUsage: [
    { id: 'EXCELLENT', label: '≥80% odkazů s UTM', min: 80 },
    { id: 'GOOD', label: '60-79% s UTM', min: 60, max: 79 },
    { id: 'MODERATE', label: '40-59% s UTM', min: 40, max: 59 },
    { id: 'LOW', label: '20-39% s UTM', min: 20, max: 39 },
    { id: 'VERY_LOW', label: '<20% s UTM', max: 19 },
  ] as CategoryDimension[],
}

export const SHARE_004_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT_DATA:
    'Pro analýzu UTM parametrů potřebujeme alespoň 3 příspěvky s odkazy. Publikujte více link postů pro smysluplnou analýzu.',

  EXCELLENT:
    'Výborně! Téměř všechny vaše odkazy mají UTM parametry. To vám umožňuje přesně měřit efektivitu Facebook marketingu. Pokračujte v této praxi a pravidelně analyzujte data v analytických nástrojích.',

  GOOD: 'Dobrá práce s UTM parametry! Většina vašich odkazů je trackovaná. Zkuste přidat UTM i ke zbývajícím odkazům pro kompletní přehled o výkonnosti.',

  MODERATE:
    'Střední využití UTM parametrů. Přibližně polovina vašich odkazů je bez trackingu, což znamená neúplná data. Vytvořte si šablonu nebo použijte URL builder pro konzistentní přidávání UTM.',

  LOW: 'Většina vašich odkazů nemá UTM parametry. To výrazně omezuje vaši schopnost měřit efektivitu Facebook marketingu. Doporučujeme nastavit proces pro automatické přidávání UTM ke všem odkazům.',

  VERY_LOW:
    'Téměř žádné vaše odkazy nemají UTM parametry. Bez trackingu nevíte, které příspěvky skutečně přivádějí návštěvníky a zákazníky. Začněte používat UTM parametry - je to základní nástroj pro měření marketingu.',
}

export function getCategoryKey(linkPostsCount: number, utmPct: number): string {
  if (linkPostsCount < 3) {
    return 'INSUFFICIENT_DATA'
  }

  const category = SHARE_004_DIMENSIONS.utmUsage.find(
    (d) => (d.min === undefined || utmPct >= d.min) && (d.max === undefined || utmPct <= d.max)
  )

  return category?.id ?? 'VERY_LOW'
}
