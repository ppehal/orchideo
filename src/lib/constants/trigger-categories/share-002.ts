/**
 * SHARE_002 - YouTube Videos category definitions
 *
 * Analyzes usage of YouTube links vs. native Facebook videos.
 * Native videos have better reach than YouTube links.
 */

import type { CategoryDimension } from './basic-001'

export const SHARE_002_INTRO = `Facebook preferuje nativní video obsah nahraný přímo na platformu před odkazy na YouTube. Důvod je jednoduchý - Facebook chce udržet uživatele na své platformě, zatímco YouTube odkaz je odvede jinam.

Nativní videa mají typicky 3-5× vyšší organický dosah než YouTube odkazy. Automatické přehrávání, lepší náhledy a integrace s algoritme - to vše hraje ve prospěch nativního videa. Pokud máte video obsah, vždy preferujte přímé nahrání na Facebook.`

export const SHARE_002_DIMENSIONS = {
  youtubeUsage: [
    { id: 'NONE', label: 'Bez YouTube odkazů', max: 0 },
    { id: 'MINIMAL', label: '1-5% YouTube', min: 0.1, max: 5 },
    { id: 'MODERATE', label: '6-15% YouTube', min: 6, max: 15 },
    { id: 'HIGH', label: '16-30% YouTube', min: 16, max: 30 },
    { id: 'VERY_HIGH', label: '>30% YouTube', min: 31 },
  ] as CategoryDimension[],
}

export const SHARE_002_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT_DATA:
    'Pro analýzu video obsahu potřebujeme alespoň 10 příspěvků. Pokračujte v publikování a vraťte se k analýze.',

  NONE: 'Perfektní! Nepoužíváte YouTube odkazy, což je ideální strategie. Všechna vaše videa jsou nativní a mají maximální potenciál dosahu. Pokračujte v tomto přístupu.',

  MINIMAL:
    'Skvěle! YouTube odkazy používáte jen minimálně. Pokud je to možné, zkuste i tyto zbývající videa nahrávat přímo na Facebook pro ještě lepší výsledky.',

  MODERATE:
    'Střední používání YouTube odkazů. Zvažte nahrávání videí přímo na Facebook - uvidíte výrazně lepší dosah. YouTube odkaz použijte jen výjimečně, když nativní nahrání není možné.',

  HIGH: 'Příliš mnoho YouTube odkazů snižuje váš celkový dosah. Facebook aktivně omezuje viditelnost externích video odkazů. Přejděte na nativní nahrávání - rozdíl v dosahu může být 3-5×.',

  VERY_HIGH:
    'Většina vašeho video obsahu jsou YouTube odkazy. To výrazně limituje váš organický dosah. Facebook tento typ obsahu penalizuje. Důrazně doporučujeme přejít na nativní videa - změna může dramaticky zvýšit váš engagement.',
}

export function getCategoryKey(postsCount: number, youtubePct: number): string {
  if (postsCount < 10) {
    return 'INSUFFICIENT_DATA'
  }

  const category = SHARE_002_DIMENSIONS.youtubeUsage.find(
    (d) =>
      (d.min === undefined || youtubePct >= d.min) && (d.max === undefined || youtubePct <= d.max)
  )

  return category?.id ?? 'VERY_HIGH'
}
