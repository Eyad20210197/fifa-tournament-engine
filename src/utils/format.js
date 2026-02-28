const AR_LOCALE = 'ar-EG'

export function formatArabicNumber(value, options = {}) {
  const number = Number(value ?? 0)
  if (!Number.isFinite(number)) return '٠'
  return new Intl.NumberFormat(AR_LOCALE, {
    useGrouping: true,
    numberingSystem: 'arab',
    ...options,
  }).format(number)
}

export function formatArabicCurrency(value, suffix = 'ج.م') {
  return `${formatArabicNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${suffix}`
}

export function formatArabicPercent(value) {
  return `${formatArabicNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}٪`
}

export function formatArabicDateTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat(AR_LOCALE, {
    numberingSystem: 'arab',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatArabicDate(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat(AR_LOCALE, {
    numberingSystem: 'arab',
    dateStyle: 'medium',
  }).format(date)
}
