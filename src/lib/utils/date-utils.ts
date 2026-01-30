const CS_LOCALE = 'cs-CZ'

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'

  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) return '—'

  return d.toLocaleDateString(CS_LOCALE, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'

  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) return '—'

  return d.toLocaleDateString(CS_LOCALE, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '—'

  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) return '—'

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'právě teď'
  } else if (diffMinutes < 60) {
    return `před ${diffMinutes} min`
  } else if (diffHours < 24) {
    return `před ${diffHours} h`
  } else if (diffDays < 7) {
    return `před ${diffDays} dny`
  } else {
    return formatDate(d)
  }
}

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'CZK'
): string {
  if (amount === null || amount === undefined) return '—'

  return new Intl.NumberFormat(CS_LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '—'

  return new Intl.NumberFormat(CS_LOCALE).format(num)
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'

  return `${(value * 100).toFixed(1)} %`
}
