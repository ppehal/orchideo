/**
 * CONT_004 - Promované posty
 *
 * Dimenze:
 * 1. Podíl promovaných příspěvků (NONE / LOW / IDEAL / HIGH / VERY_HIGH)
 *
 * + Fallback pro nedostupné metriky
 *
 * Celkem: 6 kombinací
 */

export const CONT_004_INTRO = `Žádná firemní stránka nemůže fungovat jen na základě postování příspěvků. Organický dosah na Facebooku je v posledních letech velmi nízký - typicky dosáhnete jen na 2-6% svých fanoušků.

Proto je důležité strategicky promovat nejlepší příspěvky. Ideální je promovat 10-30% příspěvků - zejména ty, které už organicky dosáhly dobrého engagementu.

Proč promovat příspěvky, které už mají dobrý engagement?
- Facebook upřednostňuje obsah s vysokým engagementem i v placené reklamě
- Lepší engagement = nižší cena za výsledek
- Kombinace organického a placeného dosahu vytváří synergii

Pozor: Příliš mnoho promovaných příspěvků (>50%) může znamenat, že váš organický obsah nefunguje a spoléháte se pouze na placené dosažení.`

export interface CategoryDimension {
  id: string
  label: string
}

export const CONT_004_DIMENSIONS = {
  promotedLevel: [
    { id: 'NONE', label: 'Žádné promované (0%)' },
    { id: 'LOW', label: 'Málo promovaných (<10%)' },
    { id: 'IDEAL', label: 'Ideální mix (10-30%)' },
    { id: 'HIGH', label: 'Hodně promovaných (30-50%)' },
    { id: 'VERY_HIGH', label: 'Příliš promovaných (>50%)' },
  ] as CategoryDimension[],
}

export const CONT_004_RECOMMENDATIONS: Record<string, string> = {
  UNAVAILABLE:
    'Data o promovaných příspěvcích nejsou dostupná. Pro tuto analýzu potřebujeme přístup k Page Insights s oprávněním read_insights.',

  NONE: 'Nepromujete žádné příspěvky. To je promarněná příležitost! Organický dosah na Facebooku je dnes velmi omezený. Začněte promovat alespoň 2-3 nejlepší příspěvky měsíčně. Vybírejte ty, které už mají dobrý organický engagement - ty budou mít i lepší výsledky v placené reklamě.',

  LOW: 'Promujete méně než 10% příspěvků, což je pod ideální úrovní. Máte prostor pro zvýšení placeného dosahu. Identifikujte své nejúspěšnější organické příspěvky a promujte je. Doporučený rozpočet: začněte s 20-50 Kč na příspěvek a sledujte výsledky.',

  IDEAL:
    'Výborně! Promujete 10-30% příspěvků, což je ideální mix. Máte dobrou rovnováhu mezi organickým a placeným dosahem. Pokračujte v této strategii a sledujte, které typy promovaných příspěvků přinášejí nejlepší výsledky.',

  HIGH: 'Promujete 30-50% příspěvků, což je poměrně hodně. Ujistěte se, že vaše organická strategie funguje. Není problém promovat více obsahu, ale nemělo by to být na úkor kvality organického engagementu. Analyzujte, zda nepromované příspěvky mají dostatečný organický dosah.',

  VERY_HIGH:
    'Promujete více než 50% příspěvků. To může znamenat, že příliš spoléháte na placený dosah. Zaměřte se na zlepšení organického obsahu - pokud organický obsah nefunguje, ani placená reklama nebude dlouhodobě efektivní. Kvalitní organický obsah je základ úspěšné Facebook strategie.',
}

/**
 * Určí kategorii na základě podílu promovaných příspěvků
 */
export function getCategoryKey(promotedPct: number | null): string {
  if (promotedPct === null) {
    return 'UNAVAILABLE'
  }

  if (promotedPct === 0) {
    return 'NONE'
  } else if (promotedPct < 10) {
    return 'LOW'
  } else if (promotedPct <= 30) {
    return 'IDEAL'
  } else if (promotedPct <= 50) {
    return 'HIGH'
  } else {
    return 'VERY_HIGH'
  }
}
