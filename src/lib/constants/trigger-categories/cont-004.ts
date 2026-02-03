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

export const CONT_004_INTRO = `Žádná firemní stránka nemůže fungovat jen na základě postování příspěvků, které nijak nepodpoříte placenou reklamou. Algoritmus je v tomto nekompromisní a postupně by Vám profil umřel. Logika je jasná:

- Organický Dosah příspěvků bude vždy malý, algoritmus jim dává Dosah jen okolo 10 - 40 % z Vaší fanouškovské základny (dle typu obsahu a počtu interakcí) a navíc jim ho zobrazí jen jednou, což 90 % z nich přescrolluje a nevšimne si jich. Reálně je tedy zaregistruje jen 1 - 5 % Vašich fanoušků a ještě méně z nich na ně zareaguje. Zároveň se každý příspěvek zobrazuje jen těm nejaktivnějším, kteří u Vás nejčastěji interagují - tedy pořád stejným lidem a ty další z fanoušků vyzkouší jen jednou za delší dobu.
- Promované posty vidí uživatel vícekrát a je násobně větší šance, že si jich všimne a zareaguje. Zároveň se tak dostávají k méně aktivním fanouškům a prostřídá se tak téměř celé jejich spektrum v každém promovaném příspěvku. Máte tak tedy zhruba 20x větší Dosah. Díky řádově většímu množství interakcí má příspěvek i Organický Dosah o mnoho vyšší. A čím více interakcí, tím levnější reklama. Proto při správně vybraném příspěvku pro promo neutratíte moc peněz, ale oslovíte celou Vaši fanouškovskou základnu.
- Pokud promo navíc z části rozpočtu zacílíte i mimo fanoušky, tak Váš profil díky tomu poroste o nové fanoušky daleko rychleji.
- Zde máte modelový příklad, jak nad celou problematikou přemýšlet:
  - Počítejme, že Vás výroba příspěvku vyjde na 15 dolarů, které platíte zaměstnanci za jeho čas.
  - Máte 15 000 fanoušků a děláte 10 příspěvků za měsíc.
  - Při 10 příspěvcích za měsíc Vás tedy vyjdou na 150 dolarů.
  - Každý příspěvek uvidí průměrně 3 000 fanoušků, což dělá celkový Organický Dosah 30 000. Ve skutečnosti to bude ale pokaždé stejných 2 500 lidí a střídat se bude jen zbylých 500 na každém příspěvku. Reálný Organický Dosah je tedy 2 500 + 10x500 = 7 500 fanoušků.
  - Každý z těchto fanoušků bude mít příspěvek na své zdi pouze jednou, takže si ho z těch 7 500 reálně všimne jen asi 500 - 1 000 (počítejme průměr 750). To je Váš reálný Dosah za náklady 150 dolarů měsíčně, pokud nebudete dělat promo příspěvků.
  - Pokud budete dělat ale pouze 6 příspěvků za měsíc, tak ušetříte 4x15 = 60 dolarů měsíčně, které můžete dát do podpory 3 nejlepších příspěvků.
  - Pokud budete dělat méně příspěvků měsíčně, tak je omezíte o ty méně kvalitní, takže bude obsah sám o sobě fungovat lépe a bude sbírat více interakcí i organicky. Navíc se nevyčerpáte s inspirací tak rychle a kvalitní obsah Vám vydrží delší dobu, než budete muset vymyslet jiná témata pro oživení.
  - Pro každý z 6 příspěvků máte tedy průměrně Organický Dosah 3 500 fanoušků (3 000 stejných + 500 fanoušků střídavě). Dohromady to dělá Organický Dosah 6x3 500 = 21 000, ale reálný Dosah je 3 000 + 6x500 = 6 000 fanoušků. Po přescrollování si příspěvků ale reálně všimne jen zhruba 500 - 900 (počítejme průměr 700) z nich.
  - K tomu máte ale 3 příspěvky zapromované každý po 20 dolarech, které Vám udělají dodatečný Dosah každý z nich 5 000 jiných fanoušků. To tedy dohromady dělá 3x5 000 = 15 000 fanoušků střídavě a každý z nich příspěvek uvidí alespoň 3x, takže si ho reálně všimne alespoň 12 000 z nich.
  - Celkový Dosah je tedy 21 000 + 15 000 = 36 000 fanoušků. Tedy za stejné náklady o 6 000 více, což je o 20 % více!
  - Reálný Dosah je ale 6 000 + 15 000 = 21 000. Ve srovnání se 7 500 je to téměř 3x více!
  - Ve skutečnosti si jich ale všimne 700 + 12 000 = 12 700 fanoušků. Tedy za stejné náklady si jich místo 750 všimne příspěvků 12 700 z celkového počtu 15 000 fanoušků, které na profilu máte - téměř všichni. Zároveň je stránka obecně o mnoho aktivnější, Váš obsah se šíří dále a sbíráte více nových fanoušků.
  - Vidíte ten rozdíl v praxi? Malá změna v přístupu, stejné náklady a diametrálně odlišné výsledky.`

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
