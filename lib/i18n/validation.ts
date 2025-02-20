interface ValidationPattern {
  regex: RegExp;
  message: string;
  format?: (value: string) => string;
  parse?: (value: string) => string;
}

interface LocalePatterns {
  number: ValidationPattern;
  currency: ValidationPattern;
  percentage: ValidationPattern;
  date: ValidationPattern;
  time: ValidationPattern;
  email: ValidationPattern;
  phone: ValidationPattern;
  postalCode: ValidationPattern;
  name?: ValidationPattern;
  address?: ValidationPattern;
  identityNumber?: ValidationPattern;
}

interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: string;
}

// Default patterns for English locale
const defaultPatterns: LocalePatterns = {
  number: {
    regex: /^-?\d*\.?\d*$/,
    message: 'Please enter a valid number',
    format: (value) => value.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
    parse: (value) => value.replace(/,/g, ''),
  },
  currency: {
    regex: /^-?\d*\.?\d*$/,
    message: 'Please enter a valid amount',
    format: (value) => value.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
    parse: (value) => value.replace(/[^0-9.-]/g, ''),
  },
  percentage: {
    regex: /^-?\d*\.?\d*%?$/,
    message: 'Please enter a valid percentage',
    format: (value) => `${value}%`,
    parse: (value) => value.replace(/[^0-9.-]/g, ''),
  },
  date: {
    regex: /^\d{4}-\d{2}-\d{2}$/,
    message: 'Please enter a valid date (YYYY-MM-DD)',
  },
  time: {
    regex: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    message: 'Please enter a valid time (HH:MM)',
  },
  email: {
    regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: 'Please enter a valid email address',
  },
  phone: {
    regex: /^\+?[\d\s-()]+$/,
    message: 'Please enter a valid phone number',
  },
  postalCode: {
    regex: /^\d{5}(-\d{4})?$/,
    message: 'Please enter a valid postal code',
  },
};

// Locale-specific patterns
const localePatterns: Record<string, Partial<LocalePatterns>> = {
  'en-US': {
    phone: {
      regex: /^\+?1?\s*\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
      message: 'Please enter a valid US phone number',
      format: (value) => {
        const digits = value.replace(/\D/g, '');
        return digits.length === 10 
          ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
          : value;
      },
    },
    postalCode: {
      regex: /^\d{5}(-\d{4})?$/,
      message: 'Please enter a valid US ZIP code',
      format: (value) => {
        const digits = value.replace(/\D/g, '');
        return digits.length > 5 
          ? `${digits.slice(0, 5)}-${digits.slice(5)}`
          : digits;
      },
    },
  },
  'en-GB': {
    phone: {
      regex: /^\+?44\s?[1-9]\d{8,9}$/,
      message: 'Please enter a valid UK phone number',
      format: (value) => {
        const digits = value.replace(/\D/g, '');
        return digits.length === 11 
          ? `${digits.slice(0, 5)} ${digits.slice(5)}`
          : value;
      },
    },
    postalCode: {
      regex: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
      message: 'Please enter a valid UK postal code',
      format: (value) => {
        const code = value.toUpperCase().replace(/\s/g, '');
        return code.length > 5 
          ? `${code.slice(0, -3)} ${code.slice(-3)}`
          : code;
      },
    },
  },
  'de-DE': {
    phone: {
      regex: /^\+?49\s?[1-9]\d{8,14}$/,
      message: 'Bitte geben Sie eine gültige deutsche Telefonnummer ein',
      format: (value) => {
        const digits = value.replace(/\D/g, '');
        if (digits.startsWith('49')) {
          return `+49 ${digits.slice(2)}`;
        }
        return value;
      },
    },
    postalCode: {
      regex: /^\d{5}$/,
      message: 'Bitte geben Sie eine gültige Postleitzahl ein',
    },
    identityNumber: {
      regex: /^[0-9A-Z]{9}$/i,
      message: 'Bitte geben Sie eine gültige Personalausweisnummer ein',
    },
  },
  'fr-FR': {
    phone: {
      regex: /^\+?33\s?[1-9]\d{8}$/,
      message: 'Veuillez entrer un numéro de téléphone français valide',
      format: (value) => {
        const digits = value.replace(/\D/g, '');
        if (digits.startsWith('33')) {
          return `+33 ${digits.slice(2)}`;
        }
        return value;
      },
    },
    postalCode: {
      regex: /^\d{5}$/,
      message: 'Veuillez entrer un code postal valide',
    },
  },
  'es-ES': {
    phone: {
      regex: /^\+?34\s?[6789]\d{8}$/,
      message: 'Por favor, introduzca un número de teléfono español válido',
      format: (value) => {
        const digits = value.replace(/\D/g, '');
        if (digits.startsWith('34')) {
          return `+34 ${digits.slice(2)}`;
        }
        return value;
      },
    },
    postalCode: {
      regex: /^\d{5}$/,
      message: 'Por favor, introduzca un código postal válido',
    },
    identityNumber: {
      regex: /^[0-9A-Z][0-9]{7}[A-Z]$/i,
      message: 'Por favor, introduzca un DNI válido',
    },
  },
  'it-IT': {
    phone: {
      regex: /^\+?39\s?[0-9]\d{9,10}$/,
      message: 'Inserisci un numero di telefono italiano valido',
      format: (value) => {
        const digits = value.replace(/\D/g, '');
        if (digits.startsWith('39')) {
          return `+39 ${digits.slice(2)}`;
        }
        return value;
      },
    },
    postalCode: {
      regex: /^\d{5}$/,
      message: 'Inserisci un codice postale valido',
    },
  },
};

export function getValidationPattern(
  type: keyof LocalePatterns,
  locale: string = 'en'
): ValidationPattern {
  try {
    // Get the base locale (e.g., 'en' from 'en-US')
    const baseLocale = locale.split('-')[0];
    
    // Try to find locale-specific patterns
    const localeSpecific = localePatterns[locale];
    if (localeSpecific?.[type]) {
      return {
        ...defaultPatterns[type],
        ...localeSpecific[type],
      };
    }

    // Fallback to default patterns
    return defaultPatterns[type];
  } catch (error) {
    console.error(`Error getting validation pattern for type ${type} and locale ${locale}:`, error);
    return defaultPatterns[type];
  }
}

export function validateValue(
  value: string,
  type: keyof LocalePatterns,
  locale?: string
): { isValid: boolean; message?: string; error?: ValidationError } {
  try {
    const pattern = getValidationPattern(type, locale);
    const isValid = pattern.regex.test(value);
    
    if (!isValid) {
      const error: ValidationError = {
        code: `INVALID_${type.toUpperCase()}`,
        message: pattern.message,
        field: type,
        value,
      };
      
      return {
        isValid: false,
        message: pattern.message,
        error,
      };
    }
    
    return { isValid: true };
  } catch (error) {
    const validationError: ValidationError = {
      code: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Validation failed',
      field: type,
      value,
    };
    
    return {
      isValid: false,
      message: validationError.message,
      error: validationError,
    };
  }
}

export function formatValueForLocale(
  value: string,
  type: keyof LocalePatterns,
  locale: string = 'en'
): string {
  try {
    const pattern = getValidationPattern(type, locale);
    
    // Use pattern's format function if available
    if (pattern.format) {
      return pattern.format(value);
    }

    // Remove any existing formatting
    const unformatted = value.replace(/[^0-9a-zA-Z@.-]/g, '');

    switch (type) {
      case 'phone':
        // Format phone numbers based on locale
        switch (locale) {
          case 'en-US':
            if (unformatted.length === 10) {
              return `(${unformatted.slice(0, 3)}) ${unformatted.slice(3, 6)}-${unformatted.slice(6)}`;
            }
            break;
          case 'en-GB':
            if (unformatted.length === 11) {
              return `${unformatted.slice(0, 5)} ${unformatted.slice(5)}`;
            }
            break;
        }
        break;

      case 'postalCode':
        // Format postal codes based on locale
        switch (locale) {
          case 'en-GB':
            if (unformatted.length > 5) {
              return `${unformatted.slice(0, -3)} ${unformatted.slice(-3)}`;
            }
            break;
        }
        break;
    }

    // Return unformatted value if no specific formatting is needed
    return unformatted;
  } catch (error) {
    console.error(`Error formatting value for type ${type} and locale ${locale}:`, error);
    return value;
  }
}

export function parseValueFromLocale(
  value: string,
  type: keyof LocalePatterns,
  locale?: string
): string {
  try {
    const pattern = getValidationPattern(type, locale);
    
    // Use pattern's parse function if available
    if (pattern.parse) {
      return pattern.parse(value);
    }

    // Remove all formatting and return raw value
    switch (type) {
      case 'phone':
      case 'postalCode':
        return value.replace(/[^0-9a-zA-Z]/g, '');
      default:
        return value;
    }
  } catch (error) {
    console.error(`Error parsing value for type ${type} and locale ${locale}:`, error);
    return value;
  }
}

// Documentation for validation rules
export const validationRules = {
  number: {
    description: 'Validates numeric input with optional decimal places',
    examples: ['123', '-123.45', '1,234.56'],
  },
  currency: {
    description: 'Validates currency amounts with optional decimal places',
    examples: ['123.45', '1,234.56', '-99.99'],
  },
  percentage: {
    description: 'Validates percentage values with optional decimal places',
    examples: ['12%', '99.9%', '0.01%'],
  },
  date: {
    description: 'Validates dates in YYYY-MM-DD format',
    examples: ['2024-03-15', '1990-01-01'],
  },
  time: {
    description: 'Validates times in 24-hour HH:MM format',
    examples: ['14:30', '09:15', '23:59'],
  },
  email: {
    description: 'Validates email addresses',
    examples: ['user@example.com', 'name.surname@domain.co.uk'],
  },
  phone: {
    description: 'Validates phone numbers based on locale',
    examples: {
      'en-US': ['(123) 456-7890', '+1 (123) 456-7890'],
      'en-GB': ['07123 456789', '+44 7123 456789'],
      'de-DE': ['+49 1234567890'],
      'fr-FR': ['+33 123456789'],
    },
  },
  postalCode: {
    description: 'Validates postal codes based on locale',
    examples: {
      'en-US': ['12345', '12345-6789'],
      'en-GB': ['SW1A 1AA', 'M1 1AA'],
      'de-DE': ['12345'],
      'fr-FR': ['75001'],
    },
  },
}; 