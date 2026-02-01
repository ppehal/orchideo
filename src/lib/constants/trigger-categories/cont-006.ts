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

export const CONT_006_INTRO = `Různé formáty příspěvků generují různé množství prokliků. Prokliky jsou důležité zejména pokud chcete návštěvnost na webu nebo v e-shopu.

Ideální stav je, když máte relativně vyrovnané prokliky napříč formáty (rozptyl do 2×). To znamená, že všechny vaše formáty fungují dobře.

Pokud máte velký rozptyl (5× a více), znamená to, že některé formáty u vás vůbec nefungují pro generování prokliků. V tom případě se zaměřte na formáty, které fungují, nebo experimentujte s vylepšením slabých formátů.

Poznámka: Data o proklikách vyžadují oprávnění read_insights. Pokud tato data nemáme, používáme engagement jako aproximaci.`

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
