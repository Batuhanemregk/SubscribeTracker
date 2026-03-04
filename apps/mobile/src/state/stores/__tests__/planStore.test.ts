import { usePlanStore } from '../planStore';
import { DEFAULT_STANDARD_PLAN, DEFAULT_PRO_PLAN } from '../../../types';

describe('planStore', () => {
  beforeEach(() => {
    usePlanStore.setState({ plan: { ...DEFAULT_STANDARD_PLAN } });
  });

  describe('default state', () => {
    it('should start with standard plan', () => {
      const state = usePlanStore.getState();
      expect(state.plan.tier).toBe('standard');
      expect(state.plan.purchasedAt).toBeNull();
      expect(state.plan.expiresAt).toBeNull();
      expect(state.plan.isTrialActive).toBe(false);
    });

    it('should have standard entitlements by default', () => {
      const { entitlements } = usePlanStore.getState().plan;
      expect(entitlements.bankStatementScan).toBe(false);
      expect(entitlements.cloudSync).toBe(false);
      expect(entitlements.dataExport).toBe(false);
      expect(entitlements.biometricLock).toBe(false);
      expect(entitlements.noAds).toBe(false);
    });
  });

  describe('isPro', () => {
    it('should return false for standard plan', () => {
      expect(usePlanStore.getState().isPro()).toBe(false);
    });

    it('should return true for pro plan', () => {
      usePlanStore.getState().upgradeToPro();
      expect(usePlanStore.getState().isPro()).toBe(true);
    });
  });

  describe('upgradeToPro', () => {
    it('should set tier to pro with all entitlements', () => {
      usePlanStore.getState().upgradeToPro();

      const state = usePlanStore.getState();
      expect(state.plan.tier).toBe('pro');
      expect(state.plan.purchasedAt).toBeTruthy();
      expect(state.plan.entitlements.bankStatementScan).toBe(true);
      expect(state.plan.entitlements.cloudSync).toBe(true);
      expect(state.plan.entitlements.dataExport).toBe(true);
      expect(state.plan.entitlements.biometricLock).toBe(true);
      expect(state.plan.entitlements.noAds).toBe(true);
    });
  });

  describe('upgradeToLifetime', () => {
    it('should set pro plan with no expiry', () => {
      usePlanStore.getState().upgradeToLifetime();

      const state = usePlanStore.getState();
      expect(state.plan.tier).toBe('pro');
      expect(state.plan.purchasedAt).toBeTruthy();
      expect(state.plan.expiresAt).toBeNull();
    });
  });

  describe('isLifetime', () => {
    it('should return false for standard plan', () => {
      expect(usePlanStore.getState().isLifetime()).toBe(false);
    });

    it('should return true for lifetime pro', () => {
      usePlanStore.getState().upgradeToLifetime();
      expect(usePlanStore.getState().isLifetime()).toBe(true);
    });

    it('should return false for pro with expiry date', () => {
      usePlanStore.getState().handlePurchaseSuccess(
        new Date().toISOString(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      );
      expect(usePlanStore.getState().isLifetime()).toBe(false);
    });
  });

  describe('downgradeToStandard', () => {
    it('should reset to standard plan', () => {
      usePlanStore.getState().upgradeToPro();
      usePlanStore.getState().downgradeToStandard();

      const state = usePlanStore.getState();
      expect(state.plan.tier).toBe('standard');
      expect(state.plan.entitlements.bankStatementScan).toBe(false);
      expect(state.plan.entitlements.cloudSync).toBe(false);
      expect(state.plan.entitlements.noAds).toBe(false);
    });
  });

  describe('startTrial', () => {
    it('should start a 7-day trial by default', () => {
      usePlanStore.getState().startTrial();

      const state = usePlanStore.getState();
      expect(state.plan.tier).toBe('pro');
      expect(state.plan.isTrialActive).toBe(true);
      expect(state.plan.trialEndsAt).toBeTruthy();

      // Trial end should be approximately 7 days from now
      const trialEnd = new Date(state.plan.trialEndsAt!).getTime();
      const expectedEnd = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(Math.abs(trialEnd - expectedEnd)).toBeLessThan(1000); // within 1 second
    });

    it('should accept custom trial duration', () => {
      usePlanStore.getState().startTrial(14);

      const state = usePlanStore.getState();
      const trialEnd = new Date(state.plan.trialEndsAt!).getTime();
      const expectedEnd = Date.now() + 14 * 24 * 60 * 60 * 1000;
      expect(Math.abs(trialEnd - expectedEnd)).toBeLessThan(1000);
    });
  });

  describe('isTrialActive', () => {
    it('should return false when no trial', () => {
      expect(usePlanStore.getState().isTrialActive()).toBe(false);
    });

    it('should return true during active trial', () => {
      usePlanStore.getState().startTrial();
      expect(usePlanStore.getState().isTrialActive()).toBe(true);
    });

    it('should return false for expired trial', () => {
      usePlanStore.setState({
        plan: {
          ...DEFAULT_PRO_PLAN,
          isTrialActive: true,
          trialEndsAt: new Date(Date.now() - 1000).toISOString(), // expired 1 second ago
        },
      });
      expect(usePlanStore.getState().isTrialActive()).toBe(false);
    });
  });

  describe('entitlement checks', () => {
    it('should deny all features for standard', () => {
      expect(usePlanStore.getState().canUseBankStatementScan()).toBe(false);
      expect(usePlanStore.getState().canUseCloudSync()).toBe(false);
      expect(usePlanStore.getState().canUseDataExport()).toBe(false);
      expect(usePlanStore.getState().canUseBiometricLock()).toBe(false);
      expect(usePlanStore.getState().shouldShowAds()).toBe(true);
    });

    it('should allow all features for pro', () => {
      usePlanStore.getState().upgradeToPro();

      expect(usePlanStore.getState().canUseBankStatementScan()).toBe(true);
      expect(usePlanStore.getState().canUseCloudSync()).toBe(true);
      expect(usePlanStore.getState().canUseDataExport()).toBe(true);
      expect(usePlanStore.getState().canUseBiometricLock()).toBe(true);
      expect(usePlanStore.getState().shouldShowAds()).toBe(false);
    });
  });

  describe('handlePurchaseSuccess', () => {
    it('should set pro plan with purchase and expiry dates', () => {
      const purchaseDate = '2026-03-01T00:00:00.000Z';
      const expiryDate = '2026-04-01T00:00:00.000Z';

      usePlanStore.getState().handlePurchaseSuccess(purchaseDate, expiryDate);

      const state = usePlanStore.getState();
      expect(state.plan.tier).toBe('pro');
      expect(state.plan.purchasedAt).toBe(purchaseDate);
      expect(state.plan.expiresAt).toBe(expiryDate);
      expect(state.plan.isTrialActive).toBe(false);
      expect(state.plan.trialEndsAt).toBeNull();
    });
  });

  describe('handlePurchaseRestore', () => {
    it('should restore pro plan with dates', () => {
      const purchaseDate = '2026-01-01T00:00:00.000Z';
      const expiryDate = '2026-07-01T00:00:00.000Z';

      usePlanStore.getState().handlePurchaseRestore(purchaseDate, expiryDate);

      const state = usePlanStore.getState();
      expect(state.plan.tier).toBe('pro');
      expect(state.plan.purchasedAt).toBe(purchaseDate);
      expect(state.plan.expiresAt).toBe(expiryDate);
    });
  });

  describe('handleLifetimePurchaseSuccess', () => {
    it('should set lifetime pro plan', () => {
      const purchaseDate = '2026-03-01T00:00:00.000Z';

      usePlanStore.getState().handleLifetimePurchaseSuccess(purchaseDate);

      const state = usePlanStore.getState();
      expect(state.plan.tier).toBe('pro');
      expect(state.plan.purchasedAt).toBe(purchaseDate);
      expect(state.plan.expiresAt).toBeNull();
      expect(state.plan.isTrialActive).toBe(false);
    });
  });

  describe('setPlan', () => {
    it('should set plan directly', () => {
      const customPlan = {
        ...DEFAULT_PRO_PLAN,
        purchasedAt: '2026-01-01',
        expiresAt: '2027-01-01',
      };

      usePlanStore.getState().setPlan(customPlan);
      expect(usePlanStore.getState().plan).toEqual(customPlan);
    });
  });
});
