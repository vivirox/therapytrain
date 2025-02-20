import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleInput } from '../LocaleInput';
import { I18nProvider } from '@/lib/i18n/i18n-context';

describe('LocaleInput', () => {
  const renderWithI18n = (ui: React.ReactElement, locale = 'en') => {
    return render(
      <I18nProvider locale={locale}>
        {ui}
      </I18nProvider>
    );
  };

  describe('Number formatting', () => {
    it('formats numbers according to locale', () => {
      const handleChange = jest.fn();
      
      // Test English format
      renderWithI18n(
        <LocaleInput
          type="number"
          value={1234.56}
          onChange={handleChange}
          aria-label="number-input"
        />,
        'en'
      );
      
      expect(screen.getByRole('textbox')).toHaveValue('1,234.56');

      // Test German format
      renderWithI18n(
        <LocaleInput
          type="number"
          value={1234.56}
          onChange={handleChange}
          aria-label="number-input"
        />,
        'de'
      );
      
      expect(screen.getByRole('textbox')).toHaveValue('1.234,56');
    });

    it('handles number input correctly', async () => {
      const handleChange = jest.fn();
      renderWithI18n(
        <LocaleInput
          type="number"
          value={0}
          onChange={handleChange}
          aria-label="number-input"
        />
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '1234.56');
      
      expect(handleChange).toHaveBeenCalledWith(1234.56);
    });
  });

  describe('Currency formatting', () => {
    it('formats currency according to locale and currency type', () => {
      const handleChange = jest.fn();
      
      // Test USD in English
      renderWithI18n(
        <LocaleInput
          type="currency"
          value={1234.56}
          currency="USD"
          onChange={handleChange}
          aria-label="currency-input"
        />,
        'en'
      );
      
      expect(screen.getByRole('textbox')).toHaveValue('$1,234.56');

      // Test EUR in German
      renderWithI18n(
        <LocaleInput
          type="currency"
          value={1234.56}
          currency="EUR"
          onChange={handleChange}
          aria-label="currency-input"
        />,
        'de'
      );
      
      expect(screen.getByRole('textbox')).toHaveValue('1.234,56 €');
    });

    it('handles currency input correctly', async () => {
      const handleChange = jest.fn();
      renderWithI18n(
        <LocaleInput
          type="currency"
          value={0}
          onChange={handleChange}
          aria-label="currency-input"
        />
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '1234.56');
      
      expect(handleChange).toHaveBeenCalledWith(1234.56);
    });
  });

  describe('Date formatting', () => {
    const testDate = new Date('2024-03-15');

    it('formats dates according to locale', () => {
      const handleChange = jest.fn();
      
      // Test English format
      renderWithI18n(
        <LocaleInput
          type="date"
          value={testDate}
          onChange={handleChange}
          aria-label="date-input"
        />,
        'en'
      );
      
      expect(screen.getByRole('textbox')).toHaveValue('March 15, 2024');

      // Test German format
      renderWithI18n(
        <LocaleInput
          type="date"
          value={testDate}
          onChange={handleChange}
          aria-label="date-input"
        />,
        'de'
      );
      
      expect(screen.getByRole('textbox')).toHaveValue('15. März 2024');
    });

    it('handles date input correctly', async () => {
      const handleChange = jest.fn();
      renderWithI18n(
        <LocaleInput
          type="date"
          value={testDate}
          onChange={handleChange}
          aria-label="date-input"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await userEvent.type(input, '2024-03-16');
      fireEvent.blur(input);
      
      expect(handleChange).toHaveBeenCalledWith(expect.any(Date));
      expect(handleChange.mock.calls[0][0].toISOString()).toContain('2024-03-16');
    });
  });

  describe('Percentage formatting', () => {
    it('formats percentages according to locale', () => {
      const handleChange = jest.fn();
      
      // Test English format
      renderWithI18n(
        <LocaleInput
          type="percentage"
          value={0.3456}
          onChange={handleChange}
          aria-label="percentage-input"
        />,
        'en'
      );
      
      expect(screen.getByRole('textbox')).toHaveValue('34.56%');

      // Test German format
      renderWithI18n(
        <LocaleInput
          type="percentage"
          value={0.3456}
          onChange={handleChange}
          aria-label="percentage-input"
        />,
        'de'
      );
      
      expect(screen.getByRole('textbox')).toHaveValue('34,56 %');
    });

    it('handles percentage input correctly', async () => {
      const handleChange = jest.fn();
      renderWithI18n(
        <LocaleInput
          type="percentage"
          value={0}
          onChange={handleChange}
          aria-label="percentage-input"
        />
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '34.56');
      
      expect(handleChange).toHaveBeenCalledWith(0.3456);
    });
  });

  describe('Accessibility', () => {
    it('sets correct ARIA attributes', () => {
      renderWithI18n(
        <LocaleInput
          type="number"
          value={1234.56}
          onChange={() => {}}
          aria-label="number-input"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'number-input');
      expect(input).toHaveAttribute('lang', 'en');
    });

    it('handles keyboard navigation', async () => {
      renderWithI18n(
        <LocaleInput
          type="number"
          value={1234.56}
          onChange={() => {}}
          aria-label="number-input"
        />
      );

      const input = screen.getByRole('textbox');
      input.focus();
      expect(document.activeElement).toBe(input);
    });
  });
}); 