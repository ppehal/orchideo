/**
 * PAGE_002 - Cover Photo category definitions
 *
 * Checks cover photo existence and provides recommendations about dimensions.
 * Special trigger without post categories - only page settings.
 */

import type { CategoryDimension } from './basic-001'

export const PAGE_002_INTRO = `Cover fotka (titulní obrázek) je největší vizuální prvek na vaší stránce. Je to první dojem, který návštěvníci získají - využijte ji k předání klíčového sdělení o vaší značce.

Ideální rozměry cover fotky jsou 851×315 pixelů pro desktop a 640×360 pixelů pro mobilní zobrazení. Protože se rozměry liší, umístěte důležité prvky do středu obrázku. Cover fotka může obsahovat text, ale měl by být dobře čitelný i na mobilu.`

export const PAGE_002_DIMENSIONS = {
  status: [
    { id: 'EXISTS', label: 'Cover fotka nastavena' },
    { id: 'MISSING', label: 'Cover fotka chybí' },
  ] as CategoryDimension[],
}

export const PAGE_002_RECOMMENDATIONS: Record<string, string> = {
  EXISTS:
    'Máte nastavenou cover fotku. Ujistěte se, že je v ideálním rozlišení 851×315 px a že klíčové prvky (text, logo) jsou viditelné i na mobilních zařízeních. Zvažte pravidelnou aktualizaci cover fotky při kampaních nebo sezónních změnách.',

  MISSING:
    'Nemáte nastavenou cover fotku! To je velká nevyužitá příležitost pro branding. Nahrajte co nejdříve kvalitní cover fotku o rozměrech 851×315 pixelů. Využijte ji k představení své značky, aktuální nabídky nebo sdělení hodnot vaší firmy.',
}

export function getCategoryKey(hasCoverPhoto: boolean): string {
  return hasCoverPhoto ? 'EXISTS' : 'MISSING'
}
