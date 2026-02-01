/**
 * TECH_006 - Emotikony
 *
 * Dimenze:
 * 1. Množství emotikonů (TOO_FEW / IDEAL / TOO_MANY)
 *
 * Celkem: 4 kombinací (1 fallback + 3 kategorie)
 */

export const TECH_006_INTRO = `Emotikony (emoji) jsou důležitým nástrojem pro zvýšení engagementu na Facebooku. Správné množství je 2-4 emoji na příspěvek.

Proč používat emotikony?
- Přitahují pozornost v newsfeedu
- Vyjadřují emoce lépe než text
- Zvyšují engagement (likes, komentáře)
- Usnadňují skenování textu

Kolik je správně?
- **0-1 emoji**: Příliš málo - příspěvek působí stroze
- **2-4 emoji**: Ideální - přitahuje pozornost, nepůsobí přeplněně
- **5-6 emoji**: Ještě OK, ale na hranici
- **7+ emoji**: Příliš - působí neprofesionálně nebo spamově

Kde emoji použít?
- Na začátku příspěvku (pozornost)
- U důležitých bodů
- Jako emoji odrážky pro seznam`

export interface CategoryDimension {
  id: string
  label: string
}

export const TECH_006_DIMENSIONS = {
  emojiLevel: [
    { id: 'TOO_FEW', label: 'Málo emotikonů' },
    { id: 'IDEAL', label: 'Ideální množství (2-4)' },
    { id: 'TOO_MANY', label: 'Příliš emotikonů' },
  ] as CategoryDimension[],
}

export const TECH_006_RECOMMENDATIONS: Record<string, string> = {
  INSUFFICIENT:
    'Nemáte dostatek příspěvků s textem pro analýzu. Pro přesné vyhodnocení potřebujeme alespoň 5 příspěvků.',

  TOO_FEW:
    'Více než polovina vašich příspěvků nemá žádné nebo jen 1 emoji. Příspěvky bez emotikonů působí stroze a méně přitahují pozornost ve feedu. Doporučení: Přidejte 2-4 emoji do každého příspěvku - na začátek pro upoutání pozornosti a k důležitým bodům.',

  IDEAL:
    'Výborně! Používáte ideální množství emotikonů (průměrně 2-4 na příspěvek). Vaše příspěvky jsou vizuálně atraktivní a přitahují pozornost. Pokračujte v tomto přístupu.',

  TOO_MANY:
    'Více než 30% vašich příspěvků má přemíru emotikonů (7+). Příliš emoji působí neprofesionálně nebo jako spam. Doporučení: Omezte se na 2-4 emoji na příspěvek. Používejte je strategicky - na začátku a u klíčových bodů.',
}

export function getCategoryKey(
  totalPosts: number,
  avgEmojis: number,
  noEmojiPercentage: number,
  tooManyPercentage: number
): string {
  if (totalPosts < 5) {
    return 'INSUFFICIENT'
  }

  if (noEmojiPercentage > 50 || avgEmojis < 2) {
    return 'TOO_FEW'
  } else if (tooManyPercentage > 30) {
    return 'TOO_MANY'
  } else {
    return 'IDEAL'
  }
}
