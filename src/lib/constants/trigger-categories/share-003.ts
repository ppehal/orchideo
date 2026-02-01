/**
 * SHARE_003 - Reels Format category definitions
 *
 * Analyzes usage of Facebook Reels for higher organic reach.
 * Ideal: 15-30% of content should be Reels.
 */

import type { CategoryDimension } from './basic-001'

export const SHARE_003_INTRO = `Facebook Reels jsou krátká vertikální videa inspirovaná formátem TikTok. V současnosti mají Reels výrazně vyšší organický dosah než tradiční příspěvky - Facebook je aktivně propaguje, aby konkuroval TikToku.

Reels se zobrazují nejen vašim fanouškům, ale také v sekci Reels, kde je vidí i lidé, kteří vás nesledují. To z nich dělá skvělý nástroj pro organický růst. Ideální je mít 15-30% obsahu ve formátu Reels - dostatečně pro využití jejich potenciálu, ale ne tolik, abyste opomíjeli jiné formáty.`

export const SHARE_003_DIMENSIONS = {
  reelsUsage: [
    { id: 'NONE', label: 'Bez Reels', max: 0 },
    { id: 'MINIMAL', label: '1-5% Reels', min: 0.1, max: 5 },
    { id: 'LOW', label: '5-15% Reels', min: 5.1, max: 14.9 },
    { id: 'OPTIMAL', label: '15-35% Reels', min: 15, max: 35 },
    { id: 'HIGH', label: '36-50% Reels', min: 36, max: 50 },
    { id: 'VERY_HIGH', label: '>50% Reels', min: 51 },
  ] as CategoryDimension[],
}

export const SHARE_003_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT_DATA:
    'Pro analýzu Reels obsahu potřebujeme alespoň 10 příspěvků. Pokračujte v publikování a vraťte se k analýze.',

  NONE: 'Nevyužíváte Reels vůbec! To je velká nevyužitá příležitost. Reels mají v současnosti nejvyšší organický dosah ze všech formátů. Začněte experimentovat - i jednoduchá krátká videa mohou mít skvělé výsledky.',

  MINIMAL:
    'Reels používáte jen minimálně. Zkuste zvýšit jejich podíl na 15-30% - uvidíte výrazný nárůst organického dosahu. Reels jsou skvělý způsob, jak oslovit nové publikum.',

  LOW: 'Dobrý začátek s Reels! Pro maximální využití jejich potenciálu zkuste zvýšit podíl na 15-30%. Reels jsou momentálně nejvíce podporovaný formát na Facebooku.',

  OPTIMAL:
    'Perfektní využití Reels! Máte ideální poměr krátkých videí v content mixu. Reels vám pomáhají dosáhnout k novému publiku, zatímco ostatní formáty udržují angažovanost stávajících fanoušků.',

  HIGH: 'Hodně Reels, což není špatně, ale může to být na úkor ostatních formátů. Sledujte, zda vaši fanoušci nereagují lépe na jiné typy obsahu. Diversifikace je klíčová.',

  VERY_HIGH:
    'Většina vašeho obsahu jsou Reels. To může vést k únavě publika a zanedbání jiných efektivních formátů. Zkuste vyvážit content mix - přidejte fotky, statusy a klasická videa pro pestrost.',
}

export function getCategoryKey(postsCount: number, reelsPct: number): string {
  if (postsCount < 10) {
    return 'INSUFFICIENT_DATA'
  }

  const category = SHARE_003_DIMENSIONS.reelsUsage.find(
    (d) => (d.min === undefined || reelsPct >= d.min) && (d.max === undefined || reelsPct <= d.max)
  )

  return category?.id ?? 'NONE'
}
