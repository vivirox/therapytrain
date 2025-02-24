import { useTranslation } from './i18n-context'

interface DateTimeFormatOptions extends Intl.DateTimeFormatOptions {
  timezone?: string
}

interface NumberFormatOptions extends Intl.NumberFormatOptions {
  style?: 'decimal' | 'percent' | 'currency'
  currency?: string
}

export function useFormatters() {
  const { currentLanguage } = useTranslation()

  const formatDate = (
    date: Date | number,
    options: DateTimeFormatOptions = {}
  ) => {
    const { timezone, ...formatOptions } = options
    const dateTimeFormat = new Intl.DateTimeFormat(
      currentLanguage,
      {
        ...formatOptions,
        timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    )
    return dateTimeFormat.format(date)
  }

  const formatTime = (
    date: Date | number,
    options: DateTimeFormatOptions = {}
  ) => {
    return formatDate(date, {
      hour: 'numeric',
      minute: 'numeric',
      ...options
    })
  }

  const formatDateTime = (
    date: Date | number,
    options: DateTimeFormatOptions = {}
  ) => {
    return formatDate(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      ...options
    })
  }

  const formatRelativeTime = (
    value: number,
    unit: Intl.RelativeTimeFormatUnit
  ) => {
    const rtf = new Intl.RelativeTimeFormat(currentLanguage, {
      numeric: 'auto'
    })
    return rtf.format(value, unit)
  }

  const formatNumber = (
    value: number,
    options: NumberFormatOptions = {}
  ) => {
    const numberFormat = new Intl.NumberFormat(
      currentLanguage,
      options
    )
    return numberFormat.format(value)
  }

  const formatCurrency = (
    value: number,
    currency: string = 'USD',
    options: Omit<NumberFormatOptions, 'style' | 'currency'> = {}
  ) => {
    return formatNumber(value, {
      style: 'currency',
      currency,
      ...options
    })
  }

  const formatPercent = (
    value: number,
    options: Omit<NumberFormatOptions, 'style'> = {}
  ) => {
    return formatNumber(value, {
      style: 'percent',
      ...options
    })
  }

  return {
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeTime,
    formatNumber,
    formatCurrency,
    formatPercent
  }
} 