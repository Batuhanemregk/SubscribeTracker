import { analyzeStatement, type ExistingSub } from '../statementAnalyzer';
import type { ExtractedSubscription } from '../../services/BankStatementService';

function makeSub(overrides: Partial<ExtractedSubscription> = {}): ExtractedSubscription {
  return {
    name: 'Netflix',
    amount: 149.99,
    currency: 'TRY',
    cycle: 'monthly',
    confidence: 0.95,
    merchantName: 'NETFLIX.COM',
    lastChargeDate: '2026-05-15',
    occurrenceCount: 3,
    chargedDates: ['2026-03-15', '2026-04-15', '2026-05-15'],
    cycleInferred: true,
    ...overrides,
  };
}

describe('analyzeStatement', () => {
  it('marks a multi-occurrence charge as recurring and auto-selects it', () => {
    const [a] = analyzeStatement([makeSub({ occurrenceCount: 3 })], []);
    expect(a.status).toBe('recurring');
    expect(a.autoSelected).toBe(true);
    expect(a.occurrences).toBe(3);
  });

  it('does NOT mark a one-time charge as auto-selected', () => {
    const [a] = analyzeStatement(
      [makeSub({ name: 'Trendyol', merchantName: 'TRENDYOL', occurrenceCount: 1 })],
      []
    );
    expect(a.status).toBe('new');
    expect(a.autoSelected).toBe(false);
  });

  it('flags an already-tracked subscription and never auto-selects it', () => {
    const existing: ExistingSub[] = [{ name: 'Netflix', amount: 149.99 }];
    const [a] = analyzeStatement([makeSub()], existing);
    expect(a.status).toBe('tracked');
    expect(a.autoSelected).toBe(false);
  });

  it('does NOT collide Netflix with an existing similarly-priced Notion', () => {
    const existing: ExistingSub[] = [{ name: 'Notion', amount: 150.0 }];
    const [a] = analyzeStatement([makeSub({ name: 'Netflix', merchantName: 'NETFLIX.COM' })], existing);
    expect(a.status).not.toBe('tracked');
  });

  it('does NOT mark tracked on amount-only similarity with a different name', () => {
    const existing: ExistingSub[] = [{ name: 'Spotify', amount: 149.99 }];
    const [a] = analyzeStatement([makeSub({ name: 'Netflix', merchantName: 'NETFLIX.COM' })], existing);
    expect(a.status).not.toBe('tracked');
  });

  it('matches via containment when the shorter name is >= 5 chars', () => {
    const existing: ExistingSub[] = [{ name: 'YouTube', amount: 57.99 }];
    const [a] = analyzeStatement(
      [makeSub({ name: 'YouTube Premium', merchantName: 'GOOGLE*YOUTUBEPREMIUM', amount: 57.99, occurrenceCount: 1 })],
      existing
    );
    expect(a.status).toBe('tracked');
  });

  it('recognizes the same known service across name forms (Claude.ai ↔ stored "Claude Pro")', () => {
    // The app stores "Claude.ai" under the canonical name "Claude Pro". A later
    // scan of "Claude.ai" — even at a different amount — must be seen as already
    // tracked (this is the cross-scan duplicate bug fix).
    const existing: ExistingSub[] = [{ name: 'Claude Pro', amount: 96.01 }];
    const [a] = analyzeStatement(
      [makeSub({ name: 'Claude.ai', merchantName: 'CLAUDE.AI SU', amount: 120.0, occurrenceCount: 2 })],
      existing
    );
    expect(a.status).toBe('tracked');
    expect(a.autoSelected).toBe(false);
  });

  it('surfaces verifyCycle when the cycle could not be confirmed', () => {
    const [a] = analyzeStatement([makeSub({ cycleInferred: false })], []);
    expect(a.verifyCycle).toBe(true);
    const [b] = analyzeStatement([makeSub({ cycleInferred: true })], []);
    expect(b.verifyCycle).toBe(false);
  });
});
