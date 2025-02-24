import * as React from 'react'
import { ReactNode } from 'react'
import { renderHook } from '@testing-library/react'
import { useFormatters } from '../formatters'
import { I18nProvider } from '../i18n-context'

describe('Formatters', () => {
  const testDate = new Date('2024-03-15T14:30:00Z')
  const testNumber = 1234.56

  const renderFormatters = (locale = 'en') => {
    return renderHook(() => useFormatters(), {
      wrapper: function TestWrapper({ children }: { children: ReactNode }) {
        return <I18nProvider locale={locale}>{children}</I18nProvider>
      }
    })
  }

  describe('Date formatting', () => {
    it('formats dates correctly in English', () => {
      const { result } = renderFormatters('en')
      
      expect(result.current.formatDate(testDate)).toBe('March 15, 2024')
      expect(result.current.formatTime(testDate)).toBe('2:30 PM')
      expect(result.current.formatDateTime(testDate)).toBe('March 15, 2024, 2:30 PM')
    })

    it('formats dates correctly in French', () => {
      const { result } = renderFormatters('fr')
      
      expect(result.current.formatDate(testDate)).toBe('15 mars 2024')
      expect(result.current.formatTime(testDate)).toBe('14:30')
      expect(result.current.formatDateTime(testDate)).toBe('15 mars 2024 14:30')
    })

    it('respects timezone options', () => {
      const { result } = renderFormatters('en')
      
      expect(
        result.current.formatTime(testDate, { timezone: 'America/New_York' })
      ).toBe('9:30 AM')
      
      expect(
        result.current.formatTime(testDate, { timezone: 'Asia/Tokyo' })
      ).toBe('11:30 PM')
    })
  })

  describe('Number formatting', () => {
    it('formats numbers correctly in English', () => {
      const { result } = renderFormatters('en')
      
      expect(result.current.formatNumber(testNumber)).toBe('1,234.56')
      expect(result.current.formatCurrency(testNumber)).toBe('$1,234.56')
      expect(result.current.formatPercent(0.3456)).toBe('34.56%')
    })

    it('formats numbers correctly in German', () => {
      const { result } = renderFormatters('de')
      
      expect(result.current.formatNumber(testNumber)).toBe('1.234,56')
      expect(result.current.formatCurrency(testNumber, 'EUR')).toBe('1.234,56 €')
      expect(result.current.formatPercent(0.3456)).toBe('34,56 %')
    })

    it('handles different currency options', () => {
      const { result } = renderFormatters('en')
      
      expect(result.current.formatCurrency(testNumber, 'JPY')).toBe('¥1,235')
      expect(result.current.formatCurrency(testNumber, 'EUR')).toBe('€1,234.56')
      expect(
        result.current.formatCurrency(testNumber, 'USD', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      ).toBe('$1,234.56')
    })
  })

  describe('Relative time formatting', () => {
    it('formats relative time in English', () => {
      const { result } = renderFormatters('en')
      
      expect(result.current.formatRelativeTime(-1, 'day')).toBe('yesterday')
      expect(result.current.formatRelativeTime(1, 'day')).toBe('tomorrow')
      expect(result.current.formatRelativeTime(-2, 'hour')).toBe('2 hours ago')
      expect(result.current.formatRelativeTime(3, 'month')).toBe('in 3 months')
    })

    it('formats relative time in Spanish', () => {
      const { result } = renderFormatters('es')
      
      expect(result.current.formatRelativeTime(-1, 'day')).toBe('ayer')
      expect(result.current.formatRelativeTime(1, 'day')).toBe('mañana')
      expect(result.current.formatRelativeTime(-2, 'hour')).toBe('hace 2 horas')
      expect(result.current.formatRelativeTime(3, 'month')).toBe('en 3 meses')
    })
  })
}) 