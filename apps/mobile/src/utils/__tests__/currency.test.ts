import {
  formatCurrency,
  formatWithConversion,
  getCurrencySymbol,
  SUPPORTED_CURRENCIES,
} from '../currency';

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe('formatCurrency', () => {
  describe('symbol placement', () => {
    it('places $ before the amount for USD', () => {
      expect(formatCurrency(9.99, 'USD')).toBe('$9.99');
    });

    it('places pound sign before the amount for GBP', () => {
      expect(formatCurrency(7.50, 'GBP')).toBe('\u00A37.50');
    });

    it('places euro sign after the amount for EUR', () => {
      const result = formatCurrency(12.99, 'EUR');
      expect(result).toBe('12.99\u20AC');
    });

    it('places lira sign after the amount for TRY', () => {
      const result = formatCurrency(49.90, 'TRY');
      expect(result).toBe('49.90\u20BA');
    });

    it('places yen sign before the amount for JPY', () => {
      expect(formatCurrency(1000, 'JPY')).toBe('\u00A51,000');
    });

    it('places C$ before the amount for CAD', () => {
      expect(formatCurrency(15.00, 'CAD')).toBe('C$15.00');
    });

    it('places A$ before the amount for AUD', () => {
      expect(formatCurrency(25.50, 'AUD')).toBe('A$25.50');
    });
  });

  describe('decimal handling', () => {
    it('uses 0 decimal places for JPY', () => {
      const result = formatCurrency(1500, 'JPY');
      // Should not contain a decimal point
      expect(result).toBe('\u00A51,500');
    });

    it('uses 2 decimal places for USD', () => {
      expect(formatCurrency(10, 'USD')).toBe('$10.00');
    });

    it('uses 2 decimal places for EUR', () => {
      expect(formatCurrency(5, 'EUR')).toBe('5.00\u20AC');
    });
  });

  describe('unknown currency fallback', () => {
    it('uses the currency code as symbol and places it before the amount', () => {
      const result = formatCurrency(100, 'XYZ');
      expect(result).toBe('XYZ100.00');
    });

    it('falls back to before position for unknown currencies', () => {
      const result = formatCurrency(50.5, 'KRW');
      expect(result).toBe('KRW50.50');
    });
  });

  describe('number formatting', () => {
    it('formats large numbers with comma separators', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
    });

    it('handles zero correctly', () => {
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
    });

    it('handles negative amounts', () => {
      const result = formatCurrency(-15.99, 'USD');
      // Intl.NumberFormat formats the negative sign within the number portion
      expect(result).toBe('$-15.99');
    });
  });
});

// ---------------------------------------------------------------------------
// formatWithConversion
// ---------------------------------------------------------------------------

describe('formatWithConversion', () => {
  it('converts the amount using the provided convert function then formats', () => {
    const mockConvert = jest.fn((amount: number, _from: string, _to: string) => amount * 0.85);

    const result = formatWithConversion(100, 'USD', 'EUR', mockConvert);

    expect(mockConvert).toHaveBeenCalledWith(100, 'USD', 'EUR');
    // 100 * 0.85 = 85.00, EUR is placed after
    expect(result).toBe('85.00\u20AC');
  });

  it('passes through when from and to are the same', () => {
    const mockConvert = jest.fn((amount: number) => amount);

    const result = formatWithConversion(50, 'USD', 'USD', mockConvert);

    expect(mockConvert).toHaveBeenCalledWith(50, 'USD', 'USD');
    expect(result).toBe('$50.00');
  });

  it('handles conversion to JPY with 0 decimals', () => {
    const mockConvert = jest.fn(() => 15000);

    const result = formatWithConversion(100, 'USD', 'JPY', mockConvert);

    expect(result).toBe('\u00A515,000');
  });
});

// ---------------------------------------------------------------------------
// getCurrencySymbol
// ---------------------------------------------------------------------------

describe('getCurrencySymbol', () => {
  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('returns euro sign for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('\u20AC');
  });

  it('returns pound sign for GBP', () => {
    expect(getCurrencySymbol('GBP')).toBe('\u00A3');
  });

  it('returns lira sign for TRY', () => {
    expect(getCurrencySymbol('TRY')).toBe('\u20BA');
  });

  it('returns yen sign for JPY', () => {
    expect(getCurrencySymbol('JPY')).toBe('\u00A5');
  });

  it('returns C$ for CAD', () => {
    expect(getCurrencySymbol('CAD')).toBe('C$');
  });

  it('returns A$ for AUD', () => {
    expect(getCurrencySymbol('AUD')).toBe('A$');
  });

  it('returns the currency code itself for unknown currencies', () => {
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
    expect(getCurrencySymbol('KRW')).toBe('KRW');
  });
});

// ---------------------------------------------------------------------------
// SUPPORTED_CURRENCIES
// ---------------------------------------------------------------------------

describe('SUPPORTED_CURRENCIES', () => {
  it('is an array', () => {
    expect(Array.isArray(SUPPORTED_CURRENCIES)).toBe(true);
  });

  it('contains at least the core currencies (USD, EUR, GBP, TRY, JPY)', () => {
    const codes = SUPPORTED_CURRENCIES.map(c => c.code);
    expect(codes).toContain('USD');
    expect(codes).toContain('EUR');
    expect(codes).toContain('GBP');
    expect(codes).toContain('TRY');
    expect(codes).toContain('JPY');
  });

  it('has 7 entries', () => {
    expect(SUPPORTED_CURRENCIES).toHaveLength(7);
  });

  it('each entry has code, name, and symbol properties', () => {
    for (const currency of SUPPORTED_CURRENCIES) {
      expect(currency).toHaveProperty('code');
      expect(currency).toHaveProperty('name');
      expect(currency).toHaveProperty('symbol');
      expect(typeof currency.code).toBe('string');
      expect(typeof currency.name).toBe('string');
      expect(typeof currency.symbol).toBe('string');
    }
  });

  it('has correct symbol for each code', () => {
    const usd = SUPPORTED_CURRENCIES.find(c => c.code === 'USD');
    expect(usd?.symbol).toBe('$');

    const eur = SUPPORTED_CURRENCIES.find(c => c.code === 'EUR');
    expect(eur?.symbol).toBe('\u20AC');

    const jpy = SUPPORTED_CURRENCIES.find(c => c.code === 'JPY');
    expect(jpy?.symbol).toBe('\u00A5');
  });
});
