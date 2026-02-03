/**
 * BASIC_002 - Struktura interakcí
 *
 * Dimenze:
 * 1. Liky vs průměr oboru (ABOVE/BELOW)
 * 2. Komentáře vs průměr oboru (ABOVE/BELOW)
 * 3. Sdílení vs průměr oboru (ABOVE/BELOW)
 *
 * + Fallback pro nedostatek interakcí
 *
 * Celkem: 9 kombinací (1 fallback + 2×2×2)
 */

export const BASIC_002_INTRO = `Pro správně fungující stránku je důležitá struktura interakcí, protože mají pro algoritmus každá jinou váhu. Zároveň je u každého druhu interakce jinak těžké takovou interakci získat. Facebook si totiž tuto náročnost uvědomuje a benefituje větším dosahem příspěvku ty druhy interakcí, které je těžší získat. Like Vám dá každý. Trošku náročnější je to s dalšími druhy reakcí, protože si uživatel musí vysunout jejich lištu, a tím dává najevo, že ho příspěvek zaujal více. Potom je dlouho nic a o velice mnoho náročnější je získat komentář, protože nad tím se uživatel musí už skutečně zamyslet (Což je v prostředí sociálních sítí spíše zřídkavá situace, protože zde uživatelé primárně bezmyšlenkovitě scrollují kvůli FOMO efektu, než je nějaký příspěvek nezaujme natolik, že se na něm zastaví a alespoň si ho přečtou.) a potom si dát práci s odpovědí. Největší váhu má sdílení, protože tím uživatel vyjadřuje, že je daný příspěvek dle něj natolik dobrý a relevantní, že si zaslouží pozornost i uživatelových přátel a je se za něj ochoten postavit a vystavit se riziku, že s ním přátelé nebudou souhlasit.`

export interface CategoryDimension {
  id: string
  label: string
}

export const BASIC_002_DIMENSIONS = {
  likesVsAvg: [
    { id: 'ABOVE', label: 'Nadprůměrně liků' },
    { id: 'BELOW', label: 'Podprůměrně liků' },
  ] as CategoryDimension[],
  commentsVsAvg: [
    { id: 'ABOVE', label: 'Nadprůměrně komentářů' },
    { id: 'BELOW', label: 'Podprůměrně komentářů' },
  ] as CategoryDimension[],
  sharesVsAvg: [
    { id: 'ABOVE', label: 'Nadprůměrně sdílení' },
    { id: 'BELOW', label: 'Podprůměrně sdílení' },
  ] as CategoryDimension[],
}

/**
 * Minimum interakcí za 30 dní pro relevantní analýzu
 */
export const BASIC_002_MIN_INTERACTIONS = 40

/**
 * Doporučení pro každou kombinaci
 * Klíč: [likes]_[comments]_[shares] nebo INSUFFICIENT
 */
export const BASIC_002_RECOMMENDATIONS: Record<string, string> = {
  // Fallback - nedostatek interakcí
  INSUFFICIENT:
    'Celkově máte příliš málo interakcí, takže není čas na vyladění jejich správného poměru. Zaměřte se spíše na jejich navýšení. Začněte klidně jen sbíráním Liků pod příspěvky. Nejlépe toho dosáhnete zábavnými příspěvky, hlasovačkami nebo soutěžemi a následnou placenou podporou těchto příspěvků.',

  // ABOVE likes
  ABOVE_BELOW_ABOVE:
    'Ve srovnání s oborem máte příliš mnoho Liků, což není dobrá zpráva, protože se ostatním lépe daří sbírat Komentáře, které mají daleko vyšší vliv na algoritmus. Dobrá zpráva ale je, že máte oproti konkurenci větší poměr Sdílení, které dělají algoritmu velice dobře. Zaměřte se na Komentáře. Dělejte častěji příspěvky, ve kterých se fanoušků ptáte na jejich spokojenost, zkušenosti, nebo na komunitní témata z oboru. Dělejte zábavné příspěvky ve formě hlasovaček mezi více možnostmi a vybízejte fanoušky k odpovědím do komentářů. Tyto druhy příspěvků potom i promujte placenou reklamou cílenou na Vaše fanoušky.',

  ABOVE_BELOW_BELOW:
    'Ve srovnání s oborem máte příliš mnoho Liků, což není dobrá zpráva, protože se ostatním lépe daří sbírat Komentáře, které mají daleko vyšší vliv na algoritmus. Bohužel k tomu máte i horší poměr Sdílení, takže budete za konkurencí zaostávat více a více, dokud něco nezměníte. Zaměřte se na Komentáře. Dělejte častěji příspěvky, ve kterých se fanoušků ptáte na jejich spokojenost, zkušenosti, nebo na komunitní témata z oboru. Dělejte zábavné příspěvky ve formě hlasovaček mezi více možnostmi a vybízejte fanoušky k odpovědím do komentářů. Tyto druhy příspěvků potom i promujte placenou reklamou cílenou na Vaše fanoušky. Sdílení pak časem třeba také přijdou, ale zatím na ně netlačte.',

  ABOVE_ABOVE_BELOW:
    'Ve srovnání s oborem máte příliš mnoho Liků, což není dobrá zpráva, protože se ostatním lépe daří sbírat Sdílení, které mají daleko vyšší vliv na algoritmus. Dobrá zpráva ale je, že máte oproti konkurenci větší poměr Komentářů, které dělají algoritmu velice dobře. Zaměřte se tedy na Sdílení. Dělejte častěji příspěvky, ve kterých je na vizuálu něco z Vašeho oboru, co je buď hodně zábavné, nebo má velký informační přínos. Dobře fungují i kontroverzní témata a obecně příspěvky, které se týkají silných lidských hodnot, se kterými se fanoušci ztotožňují. Tyto druhy příspěvků potom i promujte placenou reklamou cílenou na Vaše fanoušky. Dejte si ale pozor, abyste nepřestali dělat i ty příspěvky, které jste dělali doposud, abyste zbytečně nepřišli o ty interakce, které aktuálně získáváte.',

  ABOVE_ABOVE_ABOVE:
    'Máte nadprůměrné hodnoty ve všech kategoriích interakcí oproti oboru. Pokračujte v tom, co děláte. Pro další zlepšení se zaměřte na postupné snižování podílu Liků ve prospěch Komentářů a Sdílení, které mají vyšší hodnotu pro algoritmus.',

  // BELOW likes
  BELOW_BELOW_ABOVE:
    'Ve srovnání s oborem máte méně Liků, což je dobrá zpráva, protože se Vám oproti konkurenci lépe daří sbírat Sdílení, které mají daleko vyšší vliv na algoritmus. Drobnou chybičkou je, že máte horší poměr Komentářů a celý profil Vám táhnou jen Sdílení, na kterých by to nemělo stát, protože se situace může rychle změnit. Zaměřte se tedy i více na Komentáře. Dělejte častěji příspěvky, ve kterých se fanoušků ptáte na jejich spokojenost, zkušenosti, nebo na komunitní témata z oboru. Dělejte zábavné příspěvky ve formě hlasovaček mezi více možnostmi a vybízejte fanoušky k odpovědím do komentářů. Tyto druhy příspěvků potom i promujte placenou reklamou cílenou na Vaše fanoušky.',

  BELOW_BELOW_BELOW:
    'Ve srovnání s oborem máte méně Liků, což je dobrá zpráva, protože se Vám oproti konkurenci lépe daří sbírat Komentáře, které mají daleko vyšší vliv na algoritmus oproti Likům. Drobnou chybičkou je, že máte horší poměr Sdílení a celý profil Vám táhnou jen Komentáře. Zaměřte se tedy na Sdílení. Dělejte častěji příspěvky, ve kterých je na vizuálu něco z Vašeho oboru, co má velký informační přínos. Dobře fungují i kontroverzní témata a obecně příspěvky, které se týkají silných lidských hodnot, se kterými se fanoušci ztotožňují. Tyto druhy příspěvků potom i promujte placenou reklamou cílenou na Vaše fanoušky. Dejte si ale pozor, abyste nepřestali dělat i ty příspěvky, které jste dělali doposud, abyste zbytečně nepřišli o ty interakce, které aktuálně získáváte.',

  BELOW_ABOVE_ABOVE:
    'Ve srovnání s oborem máte méně Liků, což je dobrá zpráva, protože se Vám oproti konkurenci lépe daří sbírat jak Komentáře, tak Sdílení, které mají obojí daleko vyšší vliv na algoritmus. A to je nejideálnější varianta, kterou nechcete měnit. Určitě tedy neměňte poměr typů obsahových témat v příspěvcích, jen pracujte s množstvím příspěvků a rozpočtem, který investujete do podpory příspěvků.',

  BELOW_ABOVE_BELOW:
    'Ve srovnání s oborem máte méně Liků a více Komentářů, což je dobrá zpráva. Komentáře mají vyšší hodnotu pro algoritmus. Drobnou chybičkou je nižší podíl Sdílení. Zaměřte se tedy na Sdílení. Dělejte častěji příspěvky, ve kterých je na vizuálu něco z Vašeho oboru, co má velký informační přínos. Dobře fungují i kontroverzní témata a obecně příspěvky, které se týkají silných lidských hodnot, se kterými se fanoušci ztotožňují.',
}

/**
 * Určí kategorii podle porovnání s benchmarkem
 */
export function getComparisonCategory(value: number, benchmark: number): 'ABOVE' | 'BELOW' {
  return value >= benchmark ? 'ABOVE' : 'BELOW'
}

/**
 * Vrátí klíč kategorie pro vyhledání doporučení
 */
export function getCategoryKey(
  totalInteractions: number,
  likesPct: number,
  commentsPct: number,
  sharesPct: number,
  benchmarkLikes: number,
  benchmarkComments: number,
  benchmarkShares: number
): string {
  if (totalInteractions < BASIC_002_MIN_INTERACTIONS) {
    return 'INSUFFICIENT'
  }

  const likesCategory = getComparisonCategory(likesPct, benchmarkLikes)
  const commentsCategory = getComparisonCategory(commentsPct, benchmarkComments)
  const sharesCategory = getComparisonCategory(sharesPct, benchmarkShares)

  return `${likesCategory}_${commentsCategory}_${sharesCategory}`
}
