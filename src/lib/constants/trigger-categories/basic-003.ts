/**
 * BASIC_003 - Struktura reakcí
 *
 * Dimenze:
 * 1. Podíl liků (HIGH ≥90% / LOW <90%)
 * 2. Podíl angry reakcí (HIGH ≥15% / LOW <15%)
 *
 * + Fallback pro nedostatek reakcí
 *
 * Celkem: 5 kombinací (1 fallback + 2×2)
 */

export const BASIC_003_INTRO = `Pro algoritmus je důležité, aby stránka získávala hodnotnější typy interakcí. Obyčejný Like může dát každý, stačí na to jeden klik. Ostatní reakce (Love, Haha, Wow, Sad, Angry) jsou náročnější na získání, protože si uživatel musí rozkliknout lištu reakcí.

Tyto "emotivní" reakce signalizují Facebooku, že obsah vyvolává skutečné emoce a je tedy pro uživatele relevantnější. Stránky, které mají vysoký podíl obyčejných Liků (nad 90%), často produkují příliš "bezpečný" obsah, který nikoho příliš nezaujme.

Na druhou stranu je třeba sledovat i negativní reakce. Příliš vysoký podíl Angry reakcí (nad 15%) může signalizovat problematický nebo kontroverzní obsah, který může poškodit reputaci stránky.`

export interface CategoryDimension {
  id: string
  label: string
}

export const BASIC_003_DIMENSIONS = {
  likesPercent: [
    { id: 'HIGH', label: 'Vysoký podíl liků (≥90%)' },
    { id: 'LOW', label: 'Nízký podíl liků (<90%)' },
  ] as CategoryDimension[],
  angryPercent: [
    { id: 'HIGH', label: 'Vysoký podíl angry (≥15%)' },
    { id: 'LOW', label: 'Nízký podíl angry (<15%)' },
  ] as CategoryDimension[],
}

/**
 * Minimum reakcí za 90 dní pro relevantní analýzu
 */
export const BASIC_003_MIN_REACTIONS = 40

/**
 * Doporučení pro každou kombinaci
 * Klíč: [likes]_[angry] nebo INSUFFICIENT
 */
export const BASIC_003_RECOMMENDATIONS: Record<string, string> = {
  // Fallback - nedostatek reakcí
  INSUFFICIENT:
    'Celkově máte příliš málo reakcí, takže není čím analyzovat jejich strukturu. Zaměřte se spíše na celkové navýšení interakcí. Zkuste častěji postovat a používat emotivnější vizuály a texty.',

  // HIGH likes (≥90%)
  HIGH_LOW:
    'Máte velmi vysoký podíl obyčejných Liků (přes 90%), což znamená, že Váš obsah je příliš "bezpečný" a nevyvolává silné emoce. Zkuste více experimentovat s emočnějším obsahem - příběhy, humor, překvapivé informace, kontroverzní (ale ne urážlivé) témata. Uživatelé, kteří dají Love, Haha nebo Wow jsou pro algoritmus cennější.',

  HIGH_HIGH:
    'Máte vysoký podíl Liků a zároveň vysoký podíl negativních Angry reakcí. To je neobvyklá kombinace - Váš obsah zřejmě polarizuje publikum. Část lidí reaguje pasivně Likem, část negativně. Přehodnoťte svou obsahovou strategii a zaměřte se na obsah, který vyvolává pozitivní emoce místo negativních.',

  // LOW likes (<90%)
  LOW_LOW:
    'Výborně! Máte ideální strukturu reakcí. Podíl obyčejných Liků je pod 90%, což znamená, že Váš obsah vyvolává silnější emoční odezvy (Love, Haha, Wow). Zároveň máte nízký podíl negativních reakcí. Pokračujte v tomto typu obsahu a sledujte, které příspěvky vyvolávají nejvíce emotivních reakcí.',

  LOW_HIGH:
    'Váš obsah sice vyvolává emotivní reakce (málo obyčejných Liků), ale bohužel příliš mnoho negativních. Podíl Angry reakcí přesahuje 15%, což může signalizovat příliš kontroverzní nebo problematický obsah. Přehodnoťte témata a tón svých příspěvků. Cílem je vyvolávat pozitivní emoce (Love, Haha, Wow), ne negativní.',
}

/**
 * Určí kategorii na základě podílu liků a angry reakcí
 */
export function getCategoryKey(totalReactions: number, likesPct: number, angryPct: number): string {
  if (totalReactions < BASIC_003_MIN_REACTIONS) {
    return 'INSUFFICIENT'
  }

  const likesCategory = likesPct >= 90 ? 'HIGH' : 'LOW'
  const angryCategory = angryPct >= 15 ? 'HIGH' : 'LOW'

  return `${likesCategory}_${angryCategory}`
}
