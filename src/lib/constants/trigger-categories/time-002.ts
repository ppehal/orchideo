/**
 * TIME_002 - Posting Frequency category definitions
 *
 * Analyzes posting frequency and consistency (regularity).
 */

import type { CategoryDimension } from './basic-001'

export const TIME_002_INTRO = `Pravidelnost publikování je pro algoritmus důležitější než absolutní množství příspěvků. Facebook upřednostňuje stránky, které publikují konzistentně - tedy v předvídatelných intervalech, bez dlouhých pauz následovaných přívalem obsahu.

Ideální frekvence závisí na vašem oboru a typu obsahu. Obecně platí 3-7 příspěvků týdně jako optimum pro většinu stránek. Důležitější než počet je ale pravidelnost - lepší je 3 příspěvky týdně každý týden než 10 příspěvků jeden týden a pak měsíc ticha.`

export const TIME_002_DIMENSIONS = {
  frequency: [
    { id: 'VERY_LOW', label: '<1 post/týden', max: 0.99 },
    { id: 'LOW', label: '1-2 posty/týden', min: 1, max: 2.99 },
    { id: 'OPTIMAL', label: '3-7 postů/týden', min: 3, max: 7 },
    { id: 'HIGH', label: '8-14 postů/týden', min: 8, max: 14 },
    { id: 'VERY_HIGH', label: '>14 postů/týden', min: 15 },
  ] as CategoryDimension[],
  consistency: [
    { id: 'VERY_CONSISTENT', label: 'Velmi pravidelné (CV ≤0.3)', max: 0.3 },
    { id: 'CONSISTENT', label: 'Pravidelné (CV ≤0.5)', min: 0.31, max: 0.5 },
    { id: 'MODERATE', label: 'Střední konzistence (CV ≤0.8)', min: 0.51, max: 0.8 },
    { id: 'INCONSISTENT', label: 'Nepravidelné (CV >0.8)', min: 0.81 },
  ] as CategoryDimension[],
}

export const TIME_002_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT_DATA:
    'Pro analýzu frekvence potřebujeme alespoň 5 příspěvků za posledních 90 dní. Začněte publikovat pravidelně a vraťte se k analýze.',

  // Very low frequency
  VERY_LOW_VERY_CONSISTENT:
    'Publikujete málo, ale pravidelně. To je dobrý základ, ale pro růst potřebujete zvýšit frekvenci alespoň na 3 příspěvky týdně. Zachovejte svou pravidelnost, jen přidejte více obsahu.',

  VERY_LOW_CONSISTENT:
    'Publikujete málo, ale vcelku pravidelně. Zkuste postupně navýšit na 3-7 příspěvků týdně, ideálně v podobných intervalech jako dosud.',

  VERY_LOW_MODERATE:
    'Příspěvků je málo a nejsou příliš pravidelné. Začněte plánovat obsah dopředu a nastavte si cíl alespoň 3 příspěvky týdně v pravidelných intervalech.',

  VERY_LOW_INCONSISTENT:
    'Kombinace nízké frekvence a nepravidelnosti výrazně škodí vašemu dosahu. Facebook algoritmus upřednostňuje konzistentní publikování. Vytvořte si obsahový kalendář a držte se ho.',

  // Low frequency
  LOW_VERY_CONSISTENT:
    'Máte skvělou pravidelnost! Teď zkuste přidat 1-2 příspěvky týdně navíc a uvidíte nárůst engagementu. S vaší konzistencí byste měli snadno dosáhnout optimální frekvence.',

  LOW_CONSISTENT:
    'Publikujete pravidelně, jen trochu málo. Zkuste přidat pár příspěvků týdně navíc - ideální je 3-7 týdně. S vaší konzistencí to půjde snadno.',

  LOW_MODERATE:
    'Frekvence je pod optimem a konzistence by mohla být lepší. Zaměřte se na vytvoření pravidelného publikačního plánu s 3-5 příspěvky týdně.',

  LOW_INCONSISTENT:
    'Málo příspěvků s nepravidelnými rozestupy. Vytvořte si obsahový kalendář a plánujte příspěvky dopředu. Cíl: 3-7 příspěvků týdně v pravidelných intervalech.',

  // Optimal frequency
  OPTIMAL_VERY_CONSISTENT:
    'Perfektní! Máte ideální frekvenci publikování s vynikající pravidelností. Toto je přesně to, co Facebook algoritmus miluje. Pokračujte ve stávající strategii.',

  OPTIMAL_CONSISTENT:
    'Výborná frekvence a dobrá pravidelnost! Jste na správné cestě. Pro ještě lepší výsledky zkuste udržet ještě konzistentnější rozestupy mezi příspěvky.',

  OPTIMAL_MODERATE:
    'Frekvence je ideální, ale rozestupy mezi příspěvky kolísají. Zkuste publikovat v pravidelnějších intervalech - například každý druhý den místo náhodně.',

  OPTIMAL_INCONSISTENT:
    'Publikujete dostatečně často, ale velmi nepravidelně. Algoritmus preferuje předvídatelnost. Zkuste si nastavit pevné dny a časy pro publikování.',

  // High frequency
  HIGH_VERY_CONSISTENT:
    'Publikujete hodně, ale velmi pravidelně. Pokud máte dostatečně kvalitní obsah, může to fungovat. Sledujte engagement - pokud klesá, zkuste snížit na 5-7 příspěvků týdně.',

  HIGH_CONSISTENT:
    'Relativně vysoká frekvence s dobrou pravidelností. Sledujte, zda engagement neklesá kvůli přesycení. Pro většinu stránek je optimum 5-7 příspěvků týdně.',

  HIGH_MODERATE:
    'Publikujete hodně a ne úplně pravidelně. Zkuste buď snížit frekvenci na 5-7 týdně, nebo lépe naplánovat publikování do pravidelných intervalů.',

  HIGH_INCONSISTENT:
    'Příliš mnoho příspěvků s nepravidelnými rozestupy může unavovat vaše fanoušky. Doporučujeme snížit na 5-7 týdně a publikovat v pravidelných intervalech.',

  // Very high frequency
  VERY_HIGH_VERY_CONSISTENT:
    'Extrémně vysoká frekvence. I když je pravidelná, může to snižovat dosah jednotlivých příspěvků. Zkuste snížit na 7-10 týdně a sledujte, zda se zlepší engagement.',

  VERY_HIGH_CONSISTENT:
    'Příliš mnoho příspěvků může snižovat celkový dosah. Facebook může omezit zobrazování, aby nepřesytil feed vašich fanoušků. Zkuste snížit na 5-7 týdně.',

  VERY_HIGH_MODERATE:
    'Kombinace přílišné frekvence a střední konzistence není ideální. Doporučujeme výrazně snížit na 5-7 příspěvků týdně s pravidelnými rozestupy.',

  VERY_HIGH_INCONSISTENT:
    'Příliš mnoho nepravidelných příspěvků výrazně škodí vašemu dosahu. Snižte frekvenci na 5-7 týdně a vytvořte pravidelný publikační plán.',
}

export function getCategoryKey(
  postsCount: number,
  postsPerWeek: number,
  consistencyCV: number
): string {
  if (postsCount < 5) {
    return 'INSUFFICIENT_DATA'
  }

  const frequency = TIME_002_DIMENSIONS.frequency.find(
    (d) =>
      (d.min === undefined || postsPerWeek >= d.min) &&
      (d.max === undefined || postsPerWeek <= d.max)
  )

  const consistency = TIME_002_DIMENSIONS.consistency.find(
    (d) =>
      (d.min === undefined || consistencyCV >= d.min) &&
      (d.max === undefined || consistencyCV <= d.max)
  )

  const freqKey = frequency?.id ?? 'LOW'
  const consKey = consistency?.id ?? 'INCONSISTENT'

  return `${freqKey}_${consKey}`
}
