interface ParsedRecommendation {
  assessment: string
  tips: string[]
  originalText: string
}

export function parseRecommendation(text: string): ParsedRecommendation {
  // Split by '. ' or '! ' followed by uppercase Czech letter
  const sentences = text
    .split(/[.!]\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  if (sentences.length === 0) {
    return { assessment: '', tips: [], originalText: text }
  }

  if (sentences.length === 1) {
    // Single sentence - check if it ends with punctuation
    const cleaned = sentences[0]!
    return {
      assessment: cleaned.endsWith('.') || cleaned.endsWith('!') ? cleaned : cleaned + '.',
      tips: [],
      originalText: text,
    }
  }

  // Multiple sentences
  const firstSentence = sentences[0]!
  const restSentences = sentences.slice(1)

  // Restore punctuation that was stripped by split
  const assessment =
    firstSentence.endsWith('.') || firstSentence.endsWith('!')
      ? firstSentence
      : text[firstSentence.length] === '!'
        ? firstSentence + '!'
        : firstSentence + '.'

  const tips = restSentences.map((tip) => {
    // Already has punctuation or add it
    if (tip.endsWith('.') || tip.endsWith('!')) return tip

    // Find original punctuation in source text
    const tipStartInOriginal = text.indexOf(tip)
    if (tipStartInOriginal !== -1 && tipStartInOriginal + tip.length < text.length) {
      const nextChar = text[tipStartInOriginal + tip.length]
      if (nextChar === '!' || nextChar === '.') {
        return tip + nextChar
      }
    }

    // Default to period
    return tip + '.'
  })

  return {
    assessment,
    tips,
    originalText: text,
  }
}
