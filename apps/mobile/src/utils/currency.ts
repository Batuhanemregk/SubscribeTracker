/**
 * Currency Formatting & Conversion Utility
 * Formats amounts based on user's selected currency with real conversion
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  TRY: '₺',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
};

const CURRENCY_POSITIONS: Record<string, 'before' | 'after'> = {
  USD: 'before',
  EUR: 'after',
  TRY: 'after',
  GBP: 'before',
  JPY: 'before',
  CAD: 'before',
  AUD: 'before',
};

const CURRENCY_DECIMALS: Record<string, number> = {
  JPY: 0,
};

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const position = CURRENCY_POSITIONS[currency] || 'before';
  const decimals = CURRENCY_DECIMALS[currency] ?? 2;

  // Use Intl.NumberFormat for locale-aware formatting
  let formattedAmount: string;
  try {
    formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    formattedAmount = amount.toFixed(decimals);
  }

  if (position === 'after') {
    return `${formattedAmount}${symbol}`;
  }
  return `${symbol}${formattedAmount}`;
}

/**
 * Format amount with conversion to display currency
 * Uses the currencyStore's convert function
 */
export function formatWithConversion(
  amount: number,
  fromCurrency: string,
  displayCurrency: string,
  convert: (amount: number, from: string, to: string) => number
): string {
  const converted = convert(amount, fromCurrency, displayCurrency);
  return formatCurrency(converted, displayCurrency);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * List of supported currencies
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
];
