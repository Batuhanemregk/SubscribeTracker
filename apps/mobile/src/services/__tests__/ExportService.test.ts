import { generateCSV, generatePDFHtml } from '../ExportService';
import type { Subscription } from '../../types';

// Mock i18n
jest.mock('../../i18n', () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      'addSubscription.weekly': 'Weekly',
      'addSubscription.monthly': 'Monthly',
      'addSubscription.quarterly': 'Quarterly',
      'addSubscription.yearly': 'Yearly',
    };
    return translations[key] || key;
  },
}));

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  const now = new Date().toISOString();
  return {
    id: 'sub-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Service',
    amount: 10,
    currency: 'USD',
    cycle: 'monthly',
    nextBillingDate: '2026-04-15',
    category: 'Entertainment',
    iconKey: '🎬',
    colorKey: '#E50914',
    status: 'active',
    source: 'manual',
    detection: null,
    cancelUrl: null,
    manageUrl: null,
    notes: '',
    isTrial: false,
    trialEndsAt: null,
    lifecycle: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Subscription;
}

// =============================================================================
// generateCSV
// =============================================================================
describe('generateCSV', () => {
  it('should include CSV headers', () => {
    const csv = generateCSV([]);
    expect(csv).toContain('Name');
    expect(csv).toContain('Amount');
    expect(csv).toContain('Currency');
    expect(csv).toContain('Billing Cycle');
  });

  it('should include subscription data rows', () => {
    const subs = [
      makeSub({ name: 'Netflix', amount: 15.99, currency: 'USD', cycle: 'monthly' }),
    ];

    const csv = generateCSV(subs);
    expect(csv).toContain('Netflix');
    expect(csv).toContain('15.99');
    expect(csv).toContain('USD');
  });

  it('should include summary section', () => {
    const subs = [
      makeSub({ name: 'Netflix', amount: 15.99, status: 'active' }),
      makeSub({ name: 'Spotify', amount: 9.99, status: 'active' }),
    ];

    const csv = generateCSV(subs);
    expect(csv).toContain('SUMMARY');
    expect(csv).toContain('Total Subscriptions,2');
    expect(csv).toContain('Active,2');
  });

  it('should calculate monthly and yearly totals', () => {
    const subs = [
      makeSub({ amount: 10, cycle: 'monthly', status: 'active' }),
      makeSub({ amount: 120, cycle: 'yearly', status: 'active' }),
    ];

    const csv = generateCSV(subs);
    // 10 (monthly) + 10 (120/12) = 20 monthly
    expect(csv).toContain('Monthly Total,20.00');
    // 20 * 12 = 240
    expect(csv).toContain('Yearly Total,240.00');
  });

  it('should handle empty subscription list', () => {
    const csv = generateCSV([]);
    expect(csv).toContain('Name');
    expect(csv).toContain('SUMMARY');
    expect(csv).toContain('Total Subscriptions,0');
  });

  it('should quote names with special characters', () => {
    const subs = [makeSub({ name: 'Adobe Creative Cloud' })];
    const csv = generateCSV(subs);
    expect(csv).toContain('"Adobe Creative Cloud"');
  });
});

// =============================================================================
// generatePDFHtml
// =============================================================================
describe('generatePDFHtml', () => {
  it('should return valid HTML', () => {
    const html = generatePDFHtml([]);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
  });

  it('should include Finify branding', () => {
    const html = generatePDFHtml([]);
    expect(html).toContain('Finify');
  });

  it('should include subscription rows', () => {
    const subs = [
      makeSub({ name: 'Netflix', amount: 15.99, category: 'Entertainment' }),
    ];

    const html = generatePDFHtml(subs);
    expect(html).toContain('Netflix');
    expect(html).toContain('Entertainment');
  });

  it('should include summary stats', () => {
    const subs = [
      makeSub({ amount: 10, status: 'active' }),
      makeSub({ amount: 20, status: 'active' }),
      makeSub({ amount: 5, status: 'paused' }),
    ];

    const html = generatePDFHtml(subs);
    expect(html).toContain('3'); // total
    expect(html).toContain('2'); // active count
  });

  it('should include styled CSS', () => {
    const html = generatePDFHtml([]);
    expect(html).toContain('<style>');
    expect(html).toContain('font-family');
  });

  it('should handle empty list without crashing', () => {
    expect(() => generatePDFHtml([])).not.toThrow();
    const html = generatePDFHtml([]);
    expect(html).toContain('0'); // 0 subscriptions
  });
});
