/**
 * PAGE_001 - Profile Photo category definitions
 *
 * Checks profile photo existence and provides recommendations about dimensions.
 * Special trigger without post categories - only page settings.
 */

import type { CategoryDimension } from './basic-001'

export const PAGE_001_INTRO = `Profilová fotka je vizitka vaší stránky. Zobrazuje se vedle každého příspěvku, komentáře a zprávy. Je to první věc, kterou lidé vidí, když narazí na váš obsah v novinkách.

Ideální profilová fotka by měla být čtvercová s rozlišením alespoň 320×320 pixelů (Facebook ji zmenší na 170×170 px na počítači a 128×128 px na mobilu). Pro firemní stránky je doporučeno používat logo - čisté, čitelné a rozpoznatelné i v malé velikosti.`

export const PAGE_001_DIMENSIONS = {
  status: [
    { id: 'EXISTS', label: 'Profilová fotka nastavena' },
    { id: 'MISSING', label: 'Profilová fotka chybí' },
  ] as CategoryDimension[],
}

export const PAGE_001_RECOMMENDATIONS: Record<string, string> = {
  EXISTS:
    'Máte nastavenou profilovou fotku. Ujistěte se, že je v dostatečném rozlišení (minimálně 320×320 px) a že je vaše logo/značka dobře čitelná i v malém náhledu.',

  MISSING:
    'Nemáte nastavenou profilovou fotku! To výrazně snižuje důvěryhodnost vaší stránky. Nahrajte co nejdříve kvalitní profilovou fotku - ideálně logo vaší firmy v čtvercovém formátu o rozměrech alespoň 320×320 pixelů.',
}

export function getCategoryKey(hasProfilePhoto: boolean): string {
  return hasProfilePhoto ? 'EXISTS' : 'MISSING'
}
