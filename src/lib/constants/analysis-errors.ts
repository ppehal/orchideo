/**
 * User-friendly error messages pro různé typy chyb analýzy
 */

type ErrorMessage = { title: string; description: string }

export const ANALYSIS_ERROR_MESSAGES: Record<string, ErrorMessage> = {
  // Data collection errors
  COLLECTION_ERROR: {
    title: 'Nedostatek dat',
    description:
      'Vaše stránka nemá dostatek příspěvků za posledních 90 dní pro vytvoření analýzy. Pro kvalitní analýzu je potřeba alespoň 10 příspěvků.',
  },
  NO_POSTS: {
    title: 'Žádné příspěvky',
    description:
      'Na vaší stránce nebyly nalezeny žádné veřejné příspěvky za posledních 90 dní. Zkuste to znovu, až publikujete více obsahu.',
  },
  INSUFFICIENT_POSTS: {
    title: 'Málo příspěvků',
    description:
      'Vaše stránka má příliš málo příspěvků pro kvalitní analýzu. Doporučujeme publikovat alespoň 10 příspěvků za posledních 90 dní.',
  },

  // API/Permission errors
  FACEBOOK_API_ERROR: {
    title: 'Chyba Facebook API',
    description:
      'Nepodařilo se získat data z Facebooku. Zkontrolujte, zda má aplikace stále přístup k vaší stránce a zkuste to znovu.',
  },
  PERMISSION_ERROR: {
    title: 'Chybí oprávnění',
    description:
      'Aplikace nemá dostatečná oprávnění k analýze vaší stránky. Prosím znovu se přihlaste a udělte potřebná oprávnění.',
  },
  PAGE_ACCESS_ERROR: {
    title: 'Přístup odepřen',
    description:
      'Nemáme přístup k této stránce. Zkontrolujte, zda jste administrátorem stránky a zkuste to znovu.',
  },

  // Processing errors
  ANALYSIS_ERROR: {
    title: 'Chyba při analýze',
    description: 'Během zpracování dat nastala chyba. Prosím zkuste analýzu spustit znovu.',
  },
  TRIGGER_EVALUATION_ERROR: {
    title: 'Chyba vyhodnocení',
    description: 'Nepodařilo se vyhodnotit některé metriky. Prosím zkuste analýzu spustit znovu.',
  },

  // Timeout errors
  TIMEOUT_ERROR: {
    title: 'Vypršel časový limit',
    description:
      'Analýza trvala příliš dlouho. Vaše stránka může mít příliš mnoho dat. Prosím zkuste to znovu.',
  },

  // Generic fallback
  UNKNOWN_ERROR: {
    title: 'Neznámá chyba',
    description: 'Při analýze nastala neočekávaná chyba. Prosím zkuste to znovu za chvíli.',
  },
}

/**
 * Get user-friendly error message based on error code
 */
export function getAnalysisErrorMessage(errorCode: string | null): ErrorMessage {
  if (!errorCode || !ANALYSIS_ERROR_MESSAGES[errorCode]) {
    // Type assertion safe - UNKNOWN_ERROR always exists
    return ANALYSIS_ERROR_MESSAGES.UNKNOWN_ERROR!
  }

  // Type assertion safe because we checked above
  return ANALYSIS_ERROR_MESSAGES[errorCode]!
}
