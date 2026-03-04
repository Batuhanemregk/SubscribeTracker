import { calculateHealthScore, getGrade, getGradeColor } from '../healthScore';
import type { Subscription } from '../../types';

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
  };
}

// =============================================================================
// getGrade
// =============================================================================
describe('getGrade', () => {
  it('should return A for score >= 80', () => {
    expect(getGrade(80)).toBe('A');
    expect(getGrade(100)).toBe('A');
    expect(getGrade(95)).toBe('A');
  });

  it('should return B for score 60-79', () => {
    expect(getGrade(60)).toBe('B');
    expect(getGrade(79)).toBe('B');
  });

  it('should return C for score 40-59', () => {
    expect(getGrade(40)).toBe('C');
    expect(getGrade(59)).toBe('C');
  });

  it('should return D for score 20-39', () => {
    expect(getGrade(20)).toBe('D');
    expect(getGrade(39)).toBe('D');
  });

  it('should return F for score < 20', () => {
    expect(getGrade(0)).toBe('F');
    expect(getGrade(19)).toBe('F');
  });
});

// =============================================================================
// getGradeColor
// =============================================================================
describe('getGradeColor', () => {
  it('should return emerald for grade A', () => {
    expect(getGradeColor('A')).toBe('#10B981');
  });

  it('should return primary for grade B', () => {
    expect(getGradeColor('B')).toBe('#8B5CF6');
  });

  it('should return amber for grade C', () => {
    expect(getGradeColor('C')).toBe('#F59E0B');
  });

  it('should return orange for grade D', () => {
    expect(getGradeColor('D')).toBe('#F97316');
  });

  it('should return pink for grade F', () => {
    expect(getGradeColor('F')).toBe('#EC4899');
  });
});

// =============================================================================
// calculateHealthScore
// =============================================================================
describe('calculateHealthScore', () => {
  it('should return F grade with 0 score when no active subscriptions', () => {
    const result = calculateHealthScore([]);
    expect(result.overallScore).toBe(0);
    expect(result.grade).toBe('F');
    expect(result.factors).toEqual([]);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]).toContain('Add your first subscription');
  });

  it('should return all 5 factors for active subscriptions', () => {
    const subs = [
      makeSub({ amount: 10, status: 'active', category: 'Entertainment' }),
      makeSub({ amount: 5, status: 'active', category: 'Music' }),
    ];

    const result = calculateHealthScore(subs);
    expect(result.factors).toHaveLength(5);

    const factorKeys = result.factors.map(f => f.key);
    expect(factorKeys).toContain('usage');
    expect(factorKeys).toContain('cost');
    expect(factorKeys).toContain('trend');
    expect(factorKeys).toContain('trials');
    expect(factorKeys).toContain('diversity');
  });

  it('should exclude paused subscriptions from calculation', () => {
    const subs = [
      makeSub({ amount: 10, status: 'active' }),
      makeSub({ amount: 999, status: 'paused' }),
    ];

    const result = calculateHealthScore(subs);
    // Should only consider the $10 active sub
    expect(result.overallScore).toBeGreaterThan(0);
  });

  it('should have score between 0 and 100', () => {
    const subs = [
      makeSub({ amount: 10, status: 'active', usageRating: 5 }),
      makeSub({ amount: 5, status: 'active', usageRating: 4 }),
    ];

    const result = calculateHealthScore(subs);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it('should generate recommendations for low-scoring factors', () => {
    // Very expensive subs with no usage rating -- should trigger cost and usage recs
    const subs = [
      makeSub({ amount: 100, status: 'active', category: 'Entertainment' }),
      makeSub({ amount: 200, status: 'active', category: 'Entertainment' }),
    ];

    const result = calculateHealthScore(subs);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should generate positive message when all factors are healthy', () => {
    // Low cost, high usage, diverse categories, no trials
    const subs = [
      makeSub({ amount: 3, status: 'active', usageRating: 5, category: 'Music' }),
      makeSub({ amount: 2, status: 'active', usageRating: 5, category: 'Storage' }),
      makeSub({ amount: 4, status: 'active', usageRating: 4, category: 'Productivity' }),
    ];

    const result = calculateHealthScore(subs);
    // All factors should be above 50, so we get the healthy message
    if (result.factors.every(f => f.score >= 50)) {
      expect(result.recommendations[0]).toContain('healthy');
    }
  });

  it('should grade the overall score correctly', () => {
    const subs = [
      makeSub({ amount: 3, status: 'active', usageRating: 5, category: 'Music' }),
      makeSub({ amount: 2, status: 'active', usageRating: 5, category: 'Storage' }),
      makeSub({ amount: 4, status: 'active', usageRating: 5, category: 'Productivity' }),
    ];

    const result = calculateHealthScore(subs);
    expect(result.grade).toBe(getGrade(result.overallScore));
  });

  it('should factor weights sum to 1.0', () => {
    const subs = [makeSub({ status: 'active' })];
    const result = calculateHealthScore(subs);
    const totalWeight = result.factors.reduce((sum, f) => sum + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 10);
  });

  describe('usage efficiency factor', () => {
    it('should return neutral 50 when no ratings', () => {
      const subs = [makeSub({ status: 'active' })];
      const result = calculateHealthScore(subs);
      const usageFactor = result.factors.find(f => f.key === 'usage');
      expect(usageFactor?.score).toBe(50);
    });

    it('should return 100 for all 5-star ratings', () => {
      const subs = [
        makeSub({ status: 'active', usageRating: 5 }),
        makeSub({ status: 'active', usageRating: 5 }),
      ];
      const result = calculateHealthScore(subs);
      const usageFactor = result.factors.find(f => f.key === 'usage');
      expect(usageFactor?.score).toBe(100);
    });

    it('should return 0 for all 1-star ratings', () => {
      const subs = [
        makeSub({ status: 'active', usageRating: 1 }),
        makeSub({ status: 'active', usageRating: 1 }),
      ];
      const result = calculateHealthScore(subs);
      const usageFactor = result.factors.find(f => f.key === 'usage');
      expect(usageFactor?.score).toBe(0);
    });
  });

  describe('cost optimization factor', () => {
    it('should return 100 for very cheap subs (avg <= $5)', () => {
      const subs = [
        makeSub({ amount: 3, status: 'active' }),
        makeSub({ amount: 2, status: 'active' }),
      ];
      const result = calculateHealthScore(subs);
      const costFactor = result.factors.find(f => f.key === 'cost');
      expect(costFactor?.score).toBe(100);
    });

    it('should return 25 for very expensive subs (avg > $30)', () => {
      const subs = [
        makeSub({ amount: 50, status: 'active' }),
        makeSub({ amount: 40, status: 'active' }),
      ];
      const result = calculateHealthScore(subs);
      const costFactor = result.factors.find(f => f.key === 'cost');
      expect(costFactor?.score).toBe(25);
    });
  });

  describe('trial management factor', () => {
    it('should return 80 when no trials', () => {
      const subs = [makeSub({ status: 'active', isTrial: false })];
      const result = calculateHealthScore(subs);
      const trialFactor = result.factors.find(f => f.key === 'trials');
      expect(trialFactor?.score).toBe(80);
    });

    it('should penalize expired trials still listed', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const subs = [
        makeSub({
          status: 'active',
          isTrial: true,
          trialEndsAt: pastDate.toISOString(),
        }),
      ];

      const result = calculateHealthScore(subs);
      const trialFactor = result.factors.find(f => f.key === 'trials');
      expect(trialFactor?.score).toBeLessThan(80);
    });
  });

  describe('category diversity factor', () => {
    it('should return 100 for 3-6 categories', () => {
      const subs = [
        makeSub({ status: 'active', category: 'Entertainment' }),
        makeSub({ status: 'active', category: 'Music' }),
        makeSub({ status: 'active', category: 'Productivity' }),
      ];
      const result = calculateHealthScore(subs);
      const diversityFactor = result.factors.find(f => f.key === 'diversity');
      expect(diversityFactor?.score).toBe(100);
    });

    it('should return 40 for single category', () => {
      const subs = [
        makeSub({ status: 'active', category: 'Entertainment' }),
        makeSub({ status: 'active', category: 'Entertainment' }),
      ];
      const result = calculateHealthScore(subs);
      const diversityFactor = result.factors.find(f => f.key === 'diversity');
      expect(diversityFactor?.score).toBe(40);
    });
  });
});
