/**
 * TIME_003 - Best Days category definitions
 *
 * Analyzes which days of the week have the best engagement and whether user posts optimally.
 */

import type { CategoryDimension } from './basic-001'

export const TIME_003_INTRO = `Stejně jako hodiny publikování, i dny v týdnu mají různý potenciál pro engagement. Každá stránka má své optimální dny - závisí to na charakteru vašeho obsahu, oboru a demografii fanoušků.

Obecně platí, že pracovní dny mívají vyšší engagement než víkendy pro B2B obsah, zatímco lifestyle a zábavní obsah často funguje lépe o víkendech. Klíčové je poznat vzorce chování právě vašich fanoušků a přizpůsobit tomu svůj publikační plán.`

export const TIME_003_DIMENSIONS = {
  bestDaysUsage: [
    { id: 'EXCELLENT', label: '≥50% postů v nejlepších dnech', min: 50 },
    { id: 'GOOD', label: '40-49% postů v nejlepších dnech', min: 40, max: 49 },
    { id: 'FAIR', label: '25-39% postů v nejlepších dnech', min: 25, max: 39 },
    { id: 'POOR', label: '<25% postů v nejlepších dnech', max: 24 },
  ] as CategoryDimension[],
  worstDaysAvoidance: [
    { id: 'GOOD', label: '≤20% postů v nejslabších dnech', max: 20 },
    { id: 'MODERATE', label: '21-35% postů v nejslabších dnech', min: 21, max: 35 },
    { id: 'POOR', label: '>35% postů v nejslabších dnech', min: 36 },
  ] as CategoryDimension[],
}

export const TIME_003_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT_DATA:
    'Pro analýzu nejlepších dnů potřebujeme alespoň 14 příspěvků rozložených přes více dnů v týdnu. Pokračujte v publikování a experimentujte s různými dny.',

  // Excellent best days usage
  EXCELLENT_GOOD:
    'Perfektní strategie! Většinu příspěvků publikujete v nejlepších dnech a vyhýbáte se těm nejslabším. Toto je ideální přístup pro maximalizaci dosahu. Pokračujte ve sledování analytiky, protože optimální dny se mohou měnit.',

  EXCELLENT_MODERATE:
    'Výborně využíváte nejlepší dny! Zkuste ale omezit publikování v nejslabších dnech - přesměrujte tyto příspěvky na dny s vyšším engagementem.',

  EXCELLENT_POOR:
    'Hodně publikujete v nejlepších dnech, což je skvělé. Ale také hodně v nejslabších - zkuste tyto příspěvky přeplánovat na lepší dny.',

  // Good best days usage
  GOOD_GOOD:
    'Solidní strategie! Rozumně využíváte nejlepší dny a vyhýbáte se slabým. Pro ještě lepší výsledky zkuste více soustředit publikování do top 3 dnů.',

  GOOD_MODERATE:
    'Dobrá práce s nejlepšími dny, ale zkuste více omezit publikování v nejslabších dnech. Přeplánujte tyto příspěvky na dny s vyšším engagementem.',

  GOOD_POOR:
    'Využíváte nejlepší dny, ale také hodně publikujete v těch nejslabších. Zkuste přesunout více příspěvků z nejslabších dnů na ty nejlepší.',

  // Fair best days usage
  FAIR_GOOD:
    'Vyhýbáte se slabým dnům, ale nevyužíváte plně potenciál těch nejlepších. Zkuste soustředit více příspěvků do zjištěných top dnů.',

  FAIR_MODERATE:
    'Průměrná optimalizace dnů. Máte prostor pro zlepšení - zkuste více publikovat v nejlepších dnech a méně v těch slabých.',

  FAIR_POOR:
    'Nepříliš optimální rozložení. Publikujete málo v nejlepších dnech a hodně v nejslabších. Přeorganizujte svůj publikační kalendář.',

  // Poor best days usage
  POOR_GOOD:
    'Alespoň se vyhýbáte nejslabším dnům, ale nevyužíváte potenciál těch nejlepších. Zkuste více soustředit obsah do top 3 dnů s nejvyšším engagementem.',

  POOR_MODERATE:
    'Publikujete v nevhodné dny. Analyzujte zjištěné nejlepší dny a přeplánujte svůj obsahový kalendář tak, abyste více publikovali právě v nich.',

  POOR_POOR:
    'Vaše strategie dnů je opačná od optimální! Publikujete málo v nejlepších dnech a hodně v těch nejslabších. Důrazně doporučujeme přeorganizovat publikační plán podle zjištěných dat.',
}

export function getCategoryKey(
  postsCount: number,
  bestDaysPct: number,
  worstDaysPct: number,
  hasEnoughData: boolean
): string {
  if (!hasEnoughData || postsCount < 14) {
    return 'INSUFFICIENT_DATA'
  }

  const bestUsage = TIME_003_DIMENSIONS.bestDaysUsage.find(
    (d) =>
      (d.min === undefined || bestDaysPct >= d.min) && (d.max === undefined || bestDaysPct <= d.max)
  )

  const worstAvoidance = TIME_003_DIMENSIONS.worstDaysAvoidance.find(
    (d) =>
      (d.min === undefined || worstDaysPct >= d.min) &&
      (d.max === undefined || worstDaysPct <= d.max)
  )

  const bestKey = bestUsage?.id ?? 'POOR'
  const worstKey = worstAvoidance?.id ?? 'POOR'

  return `${bestKey}_${worstKey}`
}
