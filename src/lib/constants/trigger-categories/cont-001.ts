/**
 * CONT_001 - Obsahový mix
 *
 * Dimenze:
 * 1. Engagement obsah (LOW <45% / MEDIUM 45-60% / HIGH ≥60%)
 * 2. Prodejní obsah (LOW ≤15% / HIGH >15%)
 *
 * + Fallback pro nedostatek příspěvků
 *
 * Celkem: 7 kombinací (1 fallback + 3×2)
 */

export const CONT_001_INTRO = `Žádná firemní stránka nemůže fungovat jen na základě postování příspěvků o produktech a službách. Facebook chce, aby se uživatelé na platformě bavili, a proto upřednostňuje obsah, který vyvolává engagement.

Ideální obsahový mix je přibližně:
- **60%+ zábavného/engagement obsahu** - příspěvky, které baví, vzdělávají nebo vyvolávají diskuzi
- **Max 15% prodejního obsahu** - přímé nabídky produktů, služeb, akcí
- **Zbytek brandový obsah** - informace o firmě, zákulisí, hodnoty

Pokud máte příliš mnoho prodejního obsahu, algoritmus bude vaše příspěvky penalizovat a ukazovat je méně lidem. Naopak zábavný obsah má tendenci se šířit organicky.`

export interface CategoryDimension {
  id: string
  label: string
}

export const CONT_001_DIMENSIONS = {
  engagementLevel: [
    { id: 'LOW', label: 'Nízký engagement obsah (<45%)' },
    { id: 'MEDIUM', label: 'Střední engagement obsah (45-60%)' },
    { id: 'HIGH', label: 'Vysoký engagement obsah (≥60%)' },
  ] as CategoryDimension[],
  salesLevel: [
    { id: 'LOW', label: 'Nízký prodejní obsah (≤15%)' },
    { id: 'HIGH', label: 'Vysoký prodejní obsah (>15%)' },
  ] as CategoryDimension[],
}

export const CONT_001_MIN_POSTS = 10

export const CONT_001_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT:
    'Nemáte dostatek příspěvků pro analýzu obsahového mixu. Potřebujeme alespoň 10 příspěvků za posledních 90 dní.',

  // LOW engagement
  LOW_LOW:
    'Máte málo engagement obsahu (pod 45%), ale alespoň nemáte příliš prodejního. Problém je, že většinu obsahu tvoří brandové příspěvky, které sice nejsou prodejní, ale ani nevyvolávají reakce. Začněte přidávat více zábavného obsahu - memy z vašeho oboru, zajímavosti, otázky pro fanoušky, ankety.',

  LOW_HIGH:
    'Nejhorší možná kombinace - málo engagement obsahu a hodně prodejního. Algoritmus vaše příspěvky penalizuje a ukazuje je minimum lidí. Okamžitě snižte prodejní obsah pod 15% a začněte tvořit zábavný engagement obsah. Jinak budete nadále ztrácet organický dosah.',

  // MEDIUM engagement
  MEDIUM_LOW:
    'Jste na dobré cestě - engagement obsah tvoří 45-60% a prodejního máte málo. Pro další zlepšení zkuste navýšit podíl engagement obsahu nad 60%. Experimentujte s typy obsahu, které u vás fungují nejlépe.',

  MEDIUM_HIGH:
    'Máte slušný podíl engagement obsahu, ale příliš mnoho prodejního (>15%). Snižte prodejní příspěvky a nahraďte je brandovým obsahem nebo ještě lépe dalším engagement obsahem. Prodejní obsah můžete promovat placeně, ale organicky škodí.',

  // HIGH engagement
  HIGH_LOW:
    'Výborně! Máte ideální obsahový mix - hodně engagement obsahu (60%+) a málo prodejního (≤15%). Pokračujte v tomto duchu. Vaše příspěvky mají šanci na dobrý organický dosah.',

  HIGH_HIGH:
    'Máte hodně engagement obsahu, což je skvělé, ale zároveň i hodně prodejního (>15%). I když engagement obsah částečně kompenzuje prodejní, stále je vhodné snížit prodejní podíl. Prodejní příspěvky raději promujte placeně.',
}

/**
 * Určí kategorii na základě podílu engagement a prodejního obsahu
 */
export function getCategoryKey(
  totalPosts: number,
  engagementPct: number,
  salesPct: number
): string {
  if (totalPosts < CONT_001_MIN_POSTS) {
    return 'INSUFFICIENT'
  }

  let engagementCategory: string
  if (engagementPct >= 60) {
    engagementCategory = 'HIGH'
  } else if (engagementPct >= 45) {
    engagementCategory = 'MEDIUM'
  } else {
    engagementCategory = 'LOW'
  }

  const salesCategory = salesPct <= 15 ? 'LOW' : 'HIGH'

  return `${engagementCategory}_${salesCategory}`
}
