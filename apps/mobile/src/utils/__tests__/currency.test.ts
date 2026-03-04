import { formatCurrency, getCurrencySymbol, formatWithConversion, SUPPORTED_CURRENCIES } from '../currency';

// =============================================================================
// formatCurrency
// =============================================================================
describe('formatCurrency', () => {
  it('should format USD with dollar sign before amount', () => {
    expect(formatCurrency(10.5, 'USD')).toBe('$10.50');
  });

  it('should format EUR with symbol after amount', () => {
    expect(formatCurrency(10.5, 'EUR')).toMatch(/10\.50.*€/);
  });

  it('should format GBP with pound sign before amount', () => {
    expect(formatCurrency(5.99, 'GBP')).toBe('£5.99');
  });

  it('should format TRY with lira sign after amount', () => {
    expect(formatCurrency(100, 'TRY')).toMatch(/100.*₺/);
  });

  it('should format JPY with no decimals', () => {
    const result = formatCurrency(1500, 'JPY');
    expect(result).toContain('1,500');
    expect(result).not.toContain('.');
  });

  it('should format CAD with symbol before amount', () => {
    expect(formatCurrency(25.99, 'CAD')).toMatch(/C\$.*25\.99/);
  });

  it('should format AUD with symbol before amount', () => {
    expect(formatCurrency(25.99, 'AUD')).toMatch(/A\$.*25\.99/);
  });

  it('should use currency code when symbol is unknown', () => {
    const result = formatCurrency(10, 'CHF');
    expect(result).toContain('CHF');
    expect(result).toContain('10.00');
  });

  it('should handle zero amount', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('should handle large amounts with thousands separator', () => {
    const result = formatCurrency(1234567.89, 'USD');
    expect(result).toContain('1,234,567.89');
  });
});

// =============================================================================
// getCurrencySymbol
// =============================================================================
describe('getCurrencySymbol', () => {
  it('should return $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('should return euro sign for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('should return pound sign for GBP', () => {
    expect(getCurrencySymbol('GBP')).toBe('£');
  });

  it('should return lira sign for TRY', () => {
    expect(getCurrencySymbol('TRY')).toBe('₺');
  });

  it('should return yen sign for JPY', () => {
    expect(getCurrencySymbol('JPY')).toBe('¥');
  });

  it('should return C$ for CAD', () => {
    expect(getCurrencySymbol('CAD')).toBe('C$');
  });

  it('should return A$ for AUD', () => {
    expect(getCurrencySymbol('AUD')).toBe('A$');
  });

  it('should return the currency code itself for unknown currencies', () => {
    expect(getCurrencySymbol('CHF')).toBe('CHF');
    expect(getCurrencySymbol('KRW')).toBe('KRW');
  });
});

// =============================================================================
// formatWithConversion
// =============================================================================
describe('formatWithConversion', () => {
  it('should convert and format the amount', () => {
    const convert = (amount: number, from: string, to: string) => {
      if (from === 'EUR' && to === 'USD') return amount * 1.1;
      return amount;
    };

    const result = formatWithConversion(100, 'EUR', 'USD', convert);
    // 100 EUR * 1.1 = 110 USD -> "$110.00"
    expect(result).toBe('$110.00');
  });

  it('should return same currency format when from equals to', () => {
    const convert = (amount: number) => amount;
    const result = formatWithConversion(50, 'USD', 'USD', convert);
    expect(result).toBe('$50.00');
  });
});

// =============================================================================
// SUPPORTED_CURRENCIES
// =============================================================================
describe('SUPPORTED_CURRENCIES', () => {
  it('should contain expected currencies', () => {
    const codes = SUPPORTED_CURRENCIES.map(c => c.code);
    expect(codes).toContain('USD');
    expect(codes).toContain('EUR');
    expect(codes).toContain('GBP');
    expect(codes).toContain('TRY');
    expect(codes).toContain('JPY');
    expect(codes).toContain('CAD');
    expect(codes).toContain('AUD');
  });

  it('should have name and symbol for each currency', () => {
    for (const currency of SUPPORTED_CURRENCIES) {
      expect(currency.name).toBeTruthy();
      expect(currency.symbol).toBeTruthy();
      expect(currency.code).toHaveLength(3);
    }
  });
});
