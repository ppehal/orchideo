/**
 * TIME_001 - Best Hours category definitions
 *
 * Analyzes which hours have the best engagement and whether user posts during optimal times.
 */

import type { CategoryDimension } from './basic-001'

export const TIME_001_INTRO = `Publikování v pravý čas je klíčové pro maximalizaci dosahu. Facebook algoritmus upřednostňuje obsah, který rychle získává interakce. Pokud publikujete, když jsou vaši fanoušci online a aktivní, váš příspěvek má větší šanci získat rychlé interakce a tím i lepší organický dosah.

Každá stránka má své unikátní "nejlepší hodiny" - závisí to na demografii fanoušků, jejich pracovním režimu a zvyklostech. Obecně platí, že B2B stránky fungují lépe v pracovní době, zatímco B2C stránky často nejvíce rezonují večer a o víkendech.`

export const TIME_001_DIMENSIONS = {
  bestHoursUsage: [
    { id: 'EXCELLENT', label: '≥50% postů v optimálních hodinách', min: 50 },
    { id: 'GOOD', label: '30-49% postů v optimálních hodinách', min: 30, max: 49 },
    { id: 'FAIR', label: '15-29% postů v optimálních hodinách', min: 15, max: 29 },
    { id: 'POOR', label: '<15% postů v optimálních hodinách', max: 14 },
  ] as CategoryDimension[],
}

export const TIME_001_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT_DATA:
    'Pro analýzu nejlepších hodin potřebujeme alespoň 20 příspěvků s dostatečnou distribucí přes různé hodiny. Pokračujte v publikování a zkuste různé časy.',

  EXCELLENT:
    'Výborně! Většinu svých příspěvků publikujete v časech, kdy vaši fanoušci nejvíce reagují. Toto je ideální strategie pro maximalizaci organického dosahu. Pokračujte ve sledování analytiky, protože optimální časy se mohou měnit s růstem vaší audience.',

  GOOD: 'Dobré načasování! Přibližně třetina vašich příspěvků vychází v optimálních hodinách. Zkuste více soustředit publikování do zjištěných nejlepších časů - měli byste vidět nárůst engagementu. Zvažte nastavení automatického plánování příspěvků na tyto hodiny.',

  FAIR: 'Zatím nevyužíváte plný potenciál časování. Pouze malá část vašich příspěvků vychází v době, kdy jsou fanoušci nejaktivnější. Doporučujeme přeplánovat publikování do zjištěných optimálních hodin a sledovat, jak se změní dosah vašich příspěvků.',

  POOR: 'Publikujete v nepříliš optimální časy! Vaše příspěvky vycházejí převážně v hodinách, kdy vaši fanoušci nejsou aktivní. To výrazně snižuje šanci na rychlé interakce a tím i organický dosah. Změňte strategii a začněte plánovat příspěvky na zjištěné nejlepší hodiny.',
}

export function getCategoryKey(
  postsCount: number,
  bestHoursPct: number,
  hasEnoughData: boolean
): string {
  if (!hasEnoughData || postsCount < 20) {
    return 'INSUFFICIENT_DATA'
  }

  const bestHoursUsage = TIME_001_DIMENSIONS.bestHoursUsage.find(
    (d) =>
      (d.min === undefined || bestHoursPct >= d.min) &&
      (d.max === undefined || bestHoursPct <= d.max)
  )

  return bestHoursUsage?.id ?? 'POOR'
}
