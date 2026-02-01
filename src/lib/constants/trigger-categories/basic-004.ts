/**
 * BASIC_004 - Kvalita nových fanoušků
 *
 * Dimenze:
 * 1. Počet nových fanoušků za 28 dní (LOW <10 / ENOUGH ≥10)
 * 2. Kvalita nových fanoušků - poměr engagement/fan growth (GOOD ≥0.5 / BAD <0.5)
 *
 * + Fallback pro nedostupné metriky
 *
 * Celkem: 4 kombinací (1 fallback + 1 low fans + 2 quality levels)
 */

export const BASIC_004_INTRO = `Je sběr nových fanoušků vždy dobrá věc? Není. Záleží na tom, odkud tito fanoušci přicházejí a jak se následně zapojují do dění na stránce.

Pokud noví fanoušci pocházejí z nekvalitních zdrojů (např. soutěže s příliš lákavými cenami, nevhodné cílení reklam, nebo dokonce koupení fanoušci), nebudou se aktivně zapojovat a celkově sníží engagement rate vaší stránky.

Algoritmus Facebooku sleduje, jak aktivně vaši fanoušci reagují na obsah. Pokud máte hodně fanoušků, ale málo interakcí, Facebook bude vaše příspěvky ukazovat méně lidem.

Ideální stav je, když růst engagementu drží krok s růstem počtu fanoušků (poměr alespoň 0.5). To znamená, že noví fanoušci jsou skutečně kvalitní a zajímají se o váš obsah.`

export interface CategoryDimension {
  id: string
  label: string
}

export const BASIC_004_DIMENSIONS = {
  newFans: [
    { id: 'LOW', label: 'Málo nových fanoušků (<10/28d)' },
    { id: 'ENOUGH', label: 'Dostatek nových fanoušků (≥10/28d)' },
  ] as CategoryDimension[],
  qualityRatio: [
    { id: 'GOOD', label: 'Kvalitní fanoušci (ratio ≥0.5)' },
    { id: 'BAD', label: 'Nekvalitní fanoušci (ratio <0.5)' },
  ] as CategoryDimension[],
}

/**
 * Minimum nových fanoušků za 28 dní pro relevantní analýzu kvality
 */
export const BASIC_004_MIN_NEW_FANS = 10

/**
 * Práh pro kvalitní fanoušky (engagement rate vs fan growth rate)
 */
export const BASIC_004_QUALITY_THRESHOLD = 0.5

/**
 * Doporučení pro každou kombinaci
 */
export const BASIC_004_RECOMMENDATIONS: Record<string, string> = {
  // Fallback - nedostupné metriky
  UNAVAILABLE:
    'Data o růstu fanoušků nebo engagementu nejsou dostupná. Pro detailní analýzu potřebujeme přístup k Page Insights (oprávnění read_insights).',

  // LOW - málo nových fanoušků
  LOW: 'Za posledních 28 dní jste získali méně než 10 nových fanoušků, což je příliš málo pro kvalitní analýzu. Zaměřte se nejprve na růst stránky. Vyzkoušejte kampaně na získávání fanoušků nebo organický růst přes sdílení hodnotného obsahu.',

  // ENOUGH + GOOD quality
  ENOUGH_GOOD:
    'Výborně! Noví fanoušci jsou kvalitní a aktivně se zapojují do dění na stránce. Poměr engagementu k růstu fanoušků je nad 0.5, což znamená, že vaše cílení a zdroje fanoušků fungují dobře. Pokračujte v tom, co děláte, a sledujte, které zdroje přinášejí nejkvalitnější fanoušky.',

  // ENOUGH + BAD quality
  ENOUGH_BAD:
    'Máte dostatek nových fanoušků, ale jejich kvalita je nízká. Poměr engagementu k růstu fanoušků je pod 0.5, což znamená, že noví fanoušci se nezapojují. Přehodnoťte své zdroje fanoušků. Vyvarujte se soutěží s příliš atraktivními cenami, které přitahují "lovce cen" bez skutečného zájmu o váš obsah. Zkontrolujte cílení reklam a zaměřte se na kvalitu místo kvantity.',
}

/**
 * Určí kategorii na základě počtu nových fanoušků a poměru kvality
 */
export function getCategoryKey(fanAdds: number | null, qualityRatio: number | null): string {
  if (fanAdds === null || qualityRatio === null) {
    return 'UNAVAILABLE'
  }

  if (fanAdds < BASIC_004_MIN_NEW_FANS) {
    return 'LOW'
  }

  if (qualityRatio >= BASIC_004_QUALITY_THRESHOLD) {
    return 'ENOUGH_GOOD'
  }

  return 'ENOUGH_BAD'
}
