/**
 * BASIC_005 - Kvalita současných fanoušků
 *
 * Dimenze:
 * 1. Počet fanoušků (5 kategorií)
 * 2. Organický dosah (kvalitní/nekvalitní)
 *
 * Celkem: 9 kombinací (1 fallback + 4×2)
 */

export const BASIC_005_INTRO = `Kvalita nových fanoušků je důležitá, ale ze stejných důvodů je ještě důležitější kvalita současných fanoušků. Nerelevantní fanoušci jsou pro Vás balvan, který stránku postupně stáhne ke dnu a Vaše příspěvky přestanou mít dostatečný Dosah. V podstatě se stránka stane mrtvou.`

export interface CategoryDimension {
  id: string
  label: string
  min?: number
  max?: number
}

export const BASIC_005_DIMENSIONS = {
  fanCount: [
    { id: 'SMALL', label: 'Do 2 000 fanoušků', max: 1999 },
    { id: 'MEDIUM_SMALL', label: '2 000 - 6 000 fanoušků', min: 2000, max: 5999 },
    { id: 'MEDIUM', label: '6 000 - 20 000 fanoušků', min: 6000, max: 19999 },
    { id: 'MEDIUM_LARGE', label: '20 000 - 50 000 fanoušků', min: 20000, max: 49999 },
    { id: 'LARGE', label: '50 000+ fanoušků', min: 50000 },
  ] as CategoryDimension[],
  reachQuality: [
    { id: 'HIGH', label: 'Kvalitní fanoušci' },
    { id: 'LOW', label: 'Nekvalitní fanoušci' },
  ] as CategoryDimension[],
}

/**
 * Thresholds pro průměrný organický dosah na příspěvek (za 30 dní)
 * Pokud je dosah >= threshold, fanoušci jsou kvalitní
 */
export const BASIC_005_REACH_THRESHOLDS: Record<string, number> = {
  SMALL: 0, // Není relevantní - fallback
  MEDIUM_SMALL: 1500,
  MEDIUM: 4000,
  MEDIUM_LARGE: 8000,
  LARGE: 10000,
}

/**
 * Doporučení pro každou kombinaci
 * Klíč: [fanCategory]_[reachQuality] nebo pouze [fanCategory] pro SMALL
 */
export const BASIC_005_RECOMMENDATIONS: Record<string, string> = {
  // SMALL (do 2000 fans) - není relevantní zkoumat kvalitu
  SMALL:
    'Celkově máte příliš málo fanoušků, takže není chvíle pro zkoumání jejich kvality. Zaměřte se na vyšší tempo jejich růstu. Určitě Vám v tom pomůže placená podpora příspěvků, které sbírají nejvíce interakcí, ale v tomto případě doporučujeme dělat i placené kampaně zaměřené čistě jen na sběr fanoušků, Facebook k tomu má konkrétní druh kampaně, tak si ho při nastavování vyberte a zkuste do toho dát na měsíc alespoň 160 dolarů.',

  // MEDIUM_SMALL (2000-6000 fans)
  MEDIUM_SMALL_HIGH:
    'Fanoušky máte kvalitní, takže pokračujte v tom, co děláte. Neškodilo by jich ale mít více, takže se zaměřte i na sběr těch nových. Určitě Vám v tom pomůže placená podpora příspěvků, které sbírají nejvíce interakcí, ale v tomto případě doporučujeme dělat i placené kampaně zaměřené čistě jen na sběr fanoušků, Facebook k tomu má konkrétní druh kampaně, tak si ho při nastavování vyberte a zkuste do toho dát na měsíc alespoň 160 dolarů.',
  MEDIUM_SMALL_LOW:
    'Vaši fanoušci nejsou příliš aktivní a tím pádem ani kvalitní. Pravděpodobně neděláte obsah, který by pro ně byl dostatečně atraktivní. Zkuste zařadit i příspěvky, které jsou zábavnějšího charakteru a promujte je alespoň za 20 dolarů na příspěvek s cílením jen na Vaše fanoušky. Zaměřte se také na sběr nových fanoušků, Facebook k tomu má konkrétní druh kampaně, tak si ho při nastavování vyberte a zkuste do toho dát na měsíc alespoň 160 dolarů a snažte se ji cílit co nejrelevantněji tak, aby vystihovala Vašeho ideálního zákazníka.',

  // MEDIUM (6000-20000 fans)
  MEDIUM_HIGH:
    'Fanoušky máte kvalitní, takže pokračujte v tom, co děláte. Obsahová struktura témat Vám funguje dobře. Maximálně můžete dát více peněz do podpory příspěvků pro sběr více interakcí.',
  MEDIUM_LOW:
    'Vaši fanoušci nejsou příliš aktivní a tím pádem ani kvalitní. Pravděpodobně neděláte obsah, který by pro ně byl dostatečně atraktivní. Zkuste zařadit i příspěvky, které jsou zábavnějšího charakteru a promujte je alespoň za 30 dolarů na příspěvek s cílením jen na Vaše fanoušky.',

  // MEDIUM_LARGE (20000-50000 fans)
  MEDIUM_LARGE_HIGH:
    'Fanoušky máte kvalitní, takže pokračujte v tom, co děláte. Obsahová struktura témat Vám funguje dobře. Maximálně můžete dát více peněz do podpory příspěvků pro sběr více interakcí.',
  MEDIUM_LARGE_LOW:
    'Vaši fanoušci nejsou příliš aktivní a tím pádem ani kvalitní. Pravděpodobně neděláte obsah, který by pro ně byl dostatečně atraktivní. Zkuste zařadit i příspěvky, které jsou zábavnějšího charakteru a promujte je alespoň za 40 dolarů na příspěvek s cílením jen na Vaše fanoušky.',

  // LARGE (50000+ fans)
  LARGE_HIGH:
    'Fanoušky máte kvalitní, takže pokračujte v tom, co děláte. Obsahová struktura témat Vám funguje dobře. Maximálně můžete dát více peněz do podpory příspěvků pro sběr více interakcí.',
  LARGE_LOW:
    'Vaši fanoušci nejsou příliš aktivní a tím pádem ani kvalitní. Pravděpodobně neděláte obsah, který by pro ně byl dostatečně atraktivní. Zkuste zařadit i příspěvky, které jsou zábavnějšího charakteru a promujte je alespoň za 60 dolarů na příspěvek s cílením jen na Vaše fanoušky.',
}

/**
 * Určí kategorii fanoušků podle jejich počtu
 */
export function getFanCountCategory(fanCount: number): string {
  if (fanCount < 2000) return 'SMALL'
  if (fanCount < 6000) return 'MEDIUM_SMALL'
  if (fanCount < 20000) return 'MEDIUM'
  if (fanCount < 50000) return 'MEDIUM_LARGE'
  return 'LARGE'
}

/**
 * Určí kvalitu fanoušků podle organického dosahu
 * @param avgReachPerPost - průměrný organický dosah na příspěvek
 * @param fanCategory - kategorie fanoušků
 */
export function getReachQuality(avgReachPerPost: number, fanCategory: string): string {
  const threshold = BASIC_005_REACH_THRESHOLDS[fanCategory] ?? 0
  if (threshold === 0) return 'HIGH' // SMALL kategorie - není relevantní
  return avgReachPerPost >= threshold ? 'HIGH' : 'LOW'
}

/**
 * Vrátí klíč kategorie pro vyhledání doporučení
 */
export function getCategoryKey(fanCount: number, avgReachPerPost: number): string {
  const fanCategory = getFanCountCategory(fanCount)

  // Pro SMALL kategorii není relevantní zkoumat kvalitu
  if (fanCategory === 'SMALL') {
    return 'SMALL'
  }

  const reachQuality = getReachQuality(avgReachPerPost, fanCategory)
  return `${fanCategory}_${reachQuality}`
}
