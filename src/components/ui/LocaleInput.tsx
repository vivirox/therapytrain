import React from 'react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useFormatters } from '@/lib/i18n/formatters';
import { Input, InputProps } from './input';

export type LocaleInputType = 'text' | 'number' | 'date' | 'time' | 'currency' | 'percentage';

interface LocaleInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  type: LocaleInputType;
  value: string | number | Date;
  onChange: (value: string | number | Date) => void;
  currency?: string;
  locale?: string;
  format?: string;
  placeholder?: string;
}

export function LocaleInput({
  type,
  value,
  onChange,
  currency = 'USD',
  locale,
  format,
  placeholder,
  ...props
}: LocaleInputProps) {
  const { currentLanguage } = useTranslation();
  const formatters = useFormatters();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Get the active locale (either from props or from i18n context)
  const activeLocale = locale || currentLanguage;

  // Format the display value based on the input type
  const getDisplayValue = React.useCallback(() => {
    if (value === null || value === undefined) return '';

    try {
      switch (type) {
        case 'number':
          return formatters.formatNumber(value as number);
        case 'date':
          return formatters.formatDate(value as Date, { 
            format: format || undefined 
          });
        case 'time':
          return formatters.formatTime(value as Date, { 
            format: format || undefined 
          });
        case 'currency':
          return formatters.formatCurrency(value as number, currency);
        case 'percentage':
          return formatters.formatPercent(value as number);
        default:
          return String(value);
      }
    } catch (error) {
      console.error('Error formatting value:', error);
      return String(value);
    }
  }, [type, value, formatters, currency, format]);

  // Parse the input value based on the input type
  const parseValue = React.useCallback((inputValue: string) => {
    if (!inputValue) return null;

    try {
      switch (type) {
        case 'number':
          return parseFloat(inputValue.replace(/[^0-9.-]/g, ''));
        case 'date':
          return new Date(inputValue);
        case 'time':
          return new Date(`1970-01-01T${inputValue}`);
        case 'currency':
          return parseFloat(inputValue.replace(/[^0-9.-]/g, ''));
        case 'percentage':
          return parseFloat(inputValue.replace(/[^0-9.-]/g, '')) / 100;
        default:
          return inputValue;
      }
    } catch (error) {
      console.error('Error parsing value:', error);
      return null;
    }
  }, [type]);

  // Handle input change
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseValue(event.target.value);
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  // Handle focus to show unformatted value
  const handleFocus = () => {
    if (inputRef.current) {
      switch (type) {
        case 'number':
        case 'currency':
        case 'percentage':
          inputRef.current.value = String(value);
          break;
        case 'date':
        case 'time':
          if (value instanceof Date) {
            inputRef.current.value = value.toISOString().slice(0, 10);
          }
          break;
      }
    }
  };

  // Handle blur to reformat value
  const handleBlur = () => {
    if (inputRef.current) {
      inputRef.current.value = getDisplayValue();
    }
  };

  // Get input type for HTML input element
  const getInputType = () => {
    switch (type) {
      case 'date':
        return 'date';
      case 'time':
        return 'time';
      case 'number':
      case 'currency':
      case 'percentage':
        return 'text';
      default:
        return 'text';
    }
  };

  // Get input pattern for validation
  const getInputPattern = () => {
    switch (type) {
      case 'number':
        return '[0-9]*\\.?[0-9]*';
      case 'currency':
        return '[0-9]*\\.?[0-9]*';
      case 'percentage':
        return '[0-9]*\\.?[0-9]*%?';
      default:
        return undefined;
    }
  };

  return (
    <Input
      {...props}
      ref={inputRef}
      type={getInputType()}
      value={getDisplayValue()}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      pattern={getInputPattern()}
      inputMode={type === 'text' ? 'text' : 'decimal'}
      placeholder={placeholder || getDisplayValue()}
      aria-label={props['aria-label'] || type}
      lang={activeLocale}
    />
  );
} 