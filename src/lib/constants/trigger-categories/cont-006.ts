/**
 * CONT_006 - Prokliky dle formátu
 *
 * Dimenze:
 * 1. Rozptyl prokliků mezi formáty (BALANCED / MODERATE / UNBALANCED / VERY_UNBALANCED)
 *
 * + Fallback pro nedostupné metriky
 *
 * Celkem: 5 kombinací
 */

export const CONT_006_INTRO = `Prokliky na web se sbírají buď přes statický Linkshare formát, nebo přes video formát. U každého firemního profilu to ale funguje jinak - někde je lepší dělat pro prokliky videa, jinde spíše Linkshary. Čím je složitější služba nebo produkt, který prodáváte, tím více se hodí spíše video. Linkshare se hodí na méně složité produkty nebo na obecně známé produkty a služby.`

export interface CategoryDimension {
  id: string
  label: string
}

export const CONT_006_DIMENSIONS = {
  clickSpread: [
    { id: 'BALANCED', label: 'Vyrovnané prokliky (rozptyl ≤2×)' },
    { id: 'MODERATE', label: 'Mírný rozptyl (2-3×)' },
    { id: 'UNBALANCED', label: 'Nevyrovnané (3-5×)' },
    { id: 'VERY_UNBALANCED', label: 'Velmi nevyrovnané (>5×)' },
  ] as CategoryDimension[],
}

export const CONT_006_RECOMMENDATIONS: Record<string, string> = {
  UNAVAILABLE:
    'Data o proklikách nejsou dostupná. Pro tuto analýzu potřebujeme přístup k Page Insights s oprávněním read_insights. Používáme engagement jako aproximaci.',

  BALANCED:
    'Výborně! Vaše prokliky jsou relativně vyrovnané napříč formáty (rozptyl do 2×). To znamená, že všechny vaše formáty dobře generují návštěvnost. Pokračujte v diverzifikovaném přístupu k tvorbě obsahu.',

  MODERATE:
    'Máte mírný rozptyl v proklikách mezi formáty (2-3×). To je stále akceptovatelné, ale některé formáty fungují lépe než jiné. Analyzujte, které formáty generují nejvíce prokliků a zkuste posílit jejich zastoupení v obsahovém mixu.',

  UNBALANCED:
    'Vaše prokliky jsou nevyrovnané (rozptyl 3-5×). Některé formáty generují výrazně více prokliků než jiné. Zaměřte se na nejúspěšnější formáty, nebo experimentujte se zlepšením slabých - například lepší call-to-action, atraktivnější vizuály, nebo změna stylu textu.',

  VERY_UNBALANCED:
    'Máte velmi nevyrovnané prokliky (rozptyl >5×). Některé formáty u vás prakticky negenerují prokliky. Zvažte, zda tyto formáty vůbec používat, pokud je vaším cílem návštěvnost webu. Alternativně experimentujte s radikální změnou přístupu u slabých formátů.',
}

/**
 * Určí kategorii na základě rozptylu prokliků mezi formáty
 */
export function getCategoryKey(spreadRatio: number | null, hasClickData: boolean): string {
  if (!hasClickData || spreadRatio === null) {
    return 'UNAVAILABLE'
  }

  if (spreadRatio <= 2) {
    return 'BALANCED'
  } else if (spreadRatio <= 3) {
    return 'MODERATE'
  } else if (spreadRatio <= 5) {
    return 'UNBALANCED'
  } else {
    return 'VERY_UNBALANCED'
  }
}
