import {
  getValidationPattern,
  validateValue,
  formatValueForLocale,
  parseValueFromLocale,
  validationRules,
} from '../validation';

describe('Validation Utilities', () => {
  describe('getValidationPattern', () => {
    it('returns default patterns for base locale', () => {
      const pattern = getValidationPattern('number', 'en');
      expect(pattern.regex).toBeDefined();
      expect(pattern.message).toBeDefined();
      expect(pattern.format).toBeDefined();
      expect(pattern.parse).toBeDefined();
    });

    it('returns locale-specific patterns when available', () => {
      const usPattern = getValidationPattern('phone', 'en-US');
      const ukPattern = getValidationPattern('phone', 'en-GB');
      
      expect(usPattern.regex.toString()).not.toBe(ukPattern.regex.toString());
      expect(usPattern.message).not.toBe(ukPattern.message);
      expect(usPattern.format).toBeDefined();
    });

    it('falls back to default pattern when locale-specific not available', () => {
      const defaultPattern = getValidationPattern('email', 'en');
      const localePattern = getValidationPattern('email', 'fr-FR');
      
      expect(defaultPattern.regex.toString()).toBe(localePattern.regex.toString());
    });

    it('handles invalid locales gracefully', () => {
      const pattern = getValidationPattern('number', 'invalid-locale');
      expect(pattern).toBeDefined();
      expect(pattern.regex).toBeDefined();
      expect(pattern.message).toBeDefined();
    });
  });

  describe('validateValue', () => {
    describe('number validation', () => {
      it('validates numbers correctly', () => {
        expect(validateValue('123.45', 'number').isValid).toBe(true);
        expect(validateValue('-123.45', 'number').isValid).toBe(true);
        expect(validateValue('abc', 'number').isValid).toBe(false);
      });

      it('returns proper error information for invalid numbers', () => {
        const result = validateValue('abc', 'number');
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('INVALID_NUMBER');
        expect(result.error?.field).toBe('number');
        expect(result.error?.value).toBe('abc');
      });
    });

    describe('email validation', () => {
      it('validates email addresses correctly', () => {
        expect(validateValue('test@example.com', 'email').isValid).toBe(true);
        expect(validateValue('invalid-email', 'email').isValid).toBe(false);
      });

      it('validates complex email addresses', () => {
        expect(validateValue('user.name+tag@example.co.uk', 'email').isValid).toBe(true);
        expect(validateValue('user@sub.domain.com', 'email').isValid).toBe(true);
      });
    });

    describe('phone validation', () => {
      it('validates US phone numbers correctly', () => {
        const validate = (value: string) => validateValue(value, 'phone', 'en-US');
        
        expect(validate('(123) 456-7890').isValid).toBe(true);
        expect(validate('123-456-7890').isValid).toBe(true);
        expect(validate('1234567890').isValid).toBe(true);
        expect(validate('+1 (123) 456-7890').isValid).toBe(true);
        expect(validate('123-abc-defg').isValid).toBe(false);
      });

      it('validates UK phone numbers correctly', () => {
        const validate = (value: string) => validateValue(value, 'phone', 'en-GB');
        
        expect(validate('07123456789').isValid).toBe(true);
        expect(validate('+447123456789').isValid).toBe(true);
        expect(validate('123-abc-defg').isValid).toBe(false);
      });

      it('validates German phone numbers correctly', () => {
        const validate = (value: string) => validateValue(value, 'phone', 'de-DE');
        
        expect(validate('+49 1234567890').isValid).toBe(true);
        expect(validate('01234567890').isValid).toBe(true);
        expect(validate('123-abc-defg').isValid).toBe(false);
      });

      it('validates French phone numbers correctly', () => {
        const validate = (value: string) => validateValue(value, 'phone', 'fr-FR');
        
        expect(validate('+33 123456789').isValid).toBe(true);
        expect(validate('0123456789').isValid).toBe(true);
        expect(validate('123-abc-defg').isValid).toBe(false);
      });
    });

    describe('postal code validation', () => {
      it('validates US postal codes correctly', () => {
        const validate = (value: string) => validateValue(value, 'postalCode', 'en-US');
        
        expect(validate('12345').isValid).toBe(true);
        expect(validate('12345-6789').isValid).toBe(true);
        expect(validate('1234').isValid).toBe(false);
      });

      it('validates UK postal codes correctly', () => {
        const validate = (value: string) => validateValue(value, 'postalCode', 'en-GB');
        
        expect(validate('SW1A 1AA').isValid).toBe(true);
        expect(validate('M1 1AA').isValid).toBe(true);
        expect(validate('sw1a 1aa').isValid).toBe(true);
        expect(validate('12345').isValid).toBe(false);
      });

      it('validates German postal codes correctly', () => {
        const validate = (value: string) => validateValue(value, 'postalCode', 'de-DE');
        
        expect(validate('12345').isValid).toBe(true);
        expect(validate('123456').isValid).toBe(false);
      });
    });

    describe('identity number validation', () => {
      it('validates German identity numbers correctly', () => {
        const validate = (value: string) => validateValue(value, 'identityNumber', 'de-DE');
        
        expect(validate('L01X00T47').isValid).toBe(true);
        expect(validate('123456789').isValid).toBe(true);
        expect(validate('12345').isValid).toBe(false);
      });

      it('validates Spanish DNI correctly', () => {
        const validate = (value: string) => validateValue(value, 'identityNumber', 'es-ES');
        
        expect(validate('12345678Z').isValid).toBe(true);
        expect(validate('X1234567L').isValid).toBe(true);
        expect(validate('123456789').isValid).toBe(false);
      });
    });
  });

  describe('formatValueForLocale', () => {
    it('formats numbers correctly', () => {
      expect(formatValueForLocale('1234.56', 'number')).toBe('1,234.56');
      expect(formatValueForLocale('-1234.56', 'number')).toBe('-1,234.56');
    });

    it('formats US phone numbers correctly', () => {
      expect(formatValueForLocale('1234567890', 'phone', 'en-US'))
        .toBe('(123) 456-7890');
      expect(formatValueForLocale('+11234567890', 'phone', 'en-US'))
        .toBe('+11234567890');
    });

    it('formats UK phone numbers correctly', () => {
      expect(formatValueForLocale('07123456789', 'phone', 'en-GB'))
        .toBe('07123 456789');
      expect(formatValueForLocale('+447123456789', 'phone', 'en-GB'))
        .toBe('+447123456789');
    });

    it('formats German phone numbers correctly', () => {
      expect(formatValueForLocale('491234567890', 'phone', 'de-DE'))
        .toBe('+49 1234567890');
    });

    it('formats French phone numbers correctly', () => {
      expect(formatValueForLocale('33123456789', 'phone', 'fr-FR'))
        .toBe('+33 123456789');
    });

    it('formats UK postal codes correctly', () => {
      expect(formatValueForLocale('SW1A1AA', 'postalCode', 'en-GB'))
        .toBe('SW1A 1AA');
      expect(formatValueForLocale('sw1a1aa', 'postalCode', 'en-GB'))
        .toBe('SW1A 1AA');
    });

    it('formats US postal codes correctly', () => {
      expect(formatValueForLocale('123456789', 'postalCode', 'en-US'))
        .toBe('12345-6789');
    });

    it('returns unformatted value for unsupported formats', () => {
      expect(formatValueForLocale('test@example.com', 'email'))
        .toBe('test@example.com');
    });

    it('handles errors gracefully', () => {
      expect(formatValueForLocale('invalid', 'invalidType' as any))
        .toBe('invalid');
    });
  });

  describe('parseValueFromLocale', () => {
    it('parses formatted numbers correctly', () => {
      expect(parseValueFromLocale('1,234.56', 'number'))
        .toBe('1234.56');
      expect(parseValueFromLocale('-1,234.56', 'number'))
        .toBe('-1234.56');
    });

    it('removes formatting from phone numbers', () => {
      expect(parseValueFromLocale('(123) 456-7890', 'phone'))
        .toBe('1234567890');
      expect(parseValueFromLocale('+44 7123 456789', 'phone'))
        .toBe('447123456789');
    });

    it('removes formatting from postal codes', () => {
      expect(parseValueFromLocale('SW1A 1AA', 'postalCode'))
        .toBe('SW1A1AA');
      expect(parseValueFromLocale('12345-6789', 'postalCode'))
        .toBe('123456789');
    });

    it('returns original value for other types', () => {
      expect(parseValueFromLocale('test@example.com', 'email'))
        .toBe('test@example.com');
    });

    it('handles errors gracefully', () => {
      expect(parseValueFromLocale('invalid', 'invalidType' as any))
        .toBe('invalid');
    });
  });

  describe('validationRules documentation', () => {
    it('provides documentation for all validation types', () => {
      expect(validationRules.number).toBeDefined();
      expect(validationRules.currency).toBeDefined();
      expect(validationRules.percentage).toBeDefined();
      expect(validationRules.date).toBeDefined();
      expect(validationRules.time).toBeDefined();
      expect(validationRules.email).toBeDefined();
      expect(validationRules.phone).toBeDefined();
      expect(validationRules.postalCode).toBeDefined();
    });

    it('includes description and examples for each type', () => {
      Object.entries(validationRules).forEach(([type, rule]) => {
        expect(rule.description).toBeDefined();
        expect(rule.examples).toBeDefined();
      });
    });

    it('provides locale-specific examples for relevant types', () => {
      expect(validationRules.phone.examples).toHaveProperty('en-US');
      expect(validationRules.phone.examples).toHaveProperty('en-GB');
      expect(validationRules.postalCode.examples).toHaveProperty('en-US');
      expect(validationRules.postalCode.examples).toHaveProperty('en-GB');
    });
  });
}); 