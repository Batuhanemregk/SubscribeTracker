import { useCurrencyStore } from '../currencyStore';

describe('currencyStore', () => {
  beforeEach(() => {
    useCurrencyStore.setState({
      rates: {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        TRY: 36.50,
        JPY: 149.50,
        CAD: 1.36,
        AUD: 1.53,
      },
      lastFetchedAt: null,
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have fallback rates', () => {
      const state = useCurrencyStore.getState();
      expect(state.rates.USD).toBe(1);
      expect(state.rates.EUR).toBe(0.92);
      expect(state.rates.TRY).toBe(36.50);
    });

    it('should not be loading initially', () => {
      expect(useCurrencyStore.getState().isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      expect(useCurrencyStore.getState().error).toBeNull();
    });
  });

  describe('convert', () => {
    it('should return same amount for same currency', () => {
      const result = useCurrencyStore.getState().convert(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    it('should convert USD to EUR', () => {
      const result = useCurrencyStore.getState().convert(100, 'USD', 'EUR');
      // 100 / 1 (USD rate) * 0.92 (EUR rate) = 92
      expect(result).toBeCloseTo(92, 1);
    });

    it('should convert EUR to USD', () => {
      const result = useCurrencyStore.getState().convert(92, 'EUR', 'USD');
      // 92 / 0.92 (EUR rate) * 1 (USD rate) = 100
      expect(result).toBeCloseTo(100, 1);
    });

    it('should convert TRY to USD', () => {
      const result = useCurrencyStore.getState().convert(365, 'TRY', 'USD');
      // 365 / 36.50 * 1 = 10
      expect(result).toBeCloseTo(10, 1);
    });

    it('should convert USD to TRY', () => {
      const result = useCurrencyStore.getState().convert(10, 'USD', 'TRY');
      // 10 / 1 * 36.50 = 365
      expect(result).toBeCloseTo(365, 1);
    });

    it('should convert between two non-USD currencies', () => {
      const result = useCurrencyStore.getState().convert(100, 'EUR', 'GBP');
      // 100 / 0.92 * 0.79 = ~85.87
      expect(result).toBeCloseTo(100 / 0.92 * 0.79, 1);
    });

    it('should return original amount for unknown currency', () => {
      const result = useCurrencyStore.getState().convert(100, 'XYZ', 'USD');
      expect(result).toBe(100);
    });

    it('should handle zero amount', () => {
      const result = useCurrencyStore.getState().convert(0, 'USD', 'EUR');
      expect(result).toBe(0);
    });
  });

  describe('isStale', () => {
    it('should be stale when never fetched', () => {
      expect(useCurrencyStore.getState().isStale()).toBe(true);
    });

    it('should not be stale when recently fetched', () => {
      useCurrencyStore.setState({ lastFetchedAt: Date.now() });
      expect(useCurrencyStore.getState().isStale()).toBe(false);
    });

    it('should be stale after 6 hours', () => {
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000 - 1;
      useCurrencyStore.setState({ lastFetchedAt: sixHoursAgo });
      expect(useCurrencyStore.getState().isStale()).toBe(true);
    });
  });

  describe('fetchRates', () => {
    it('should skip fetch when rates are fresh', async () => {
      useCurrencyStore.setState({ lastFetchedAt: Date.now() });

      const fetchSpy = jest.spyOn(global, 'fetch');
      await useCurrencyStore.getState().fetchRates();

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('should handle fetch failure gracefully', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      await useCurrencyStore.getState().fetchRates();

      const state = useCurrencyStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');
      // Should keep existing rates
      expect(state.rates.USD).toBe(1);
    });

    it('should update rates on successful fetch', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: {
            EUR: 0.95,
            GBP: 0.80,
            TRY: 38.00,
          },
        }),
      } as Response);

      await useCurrencyStore.getState().fetchRates();

      const state = useCurrencyStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.rates.EUR).toBe(0.95);
      expect(state.rates.TRY).toBe(38.00);
      expect(state.rates.USD).toBe(1); // Always included
      expect(state.lastFetchedAt).toBeTruthy();
    });

    it('should handle invalid response format', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'data' }),
      } as Response);

      await useCurrencyStore.getState().fetchRates();

      const state = useCurrencyStore.getState();
      expect(state.error).toBe('Invalid response format');
    });

    it('should handle non-ok HTTP response', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await useCurrencyStore.getState().fetchRates();

      const state = useCurrencyStore.getState();
      expect(state.error).toBe('HTTP 500');
    });
  });
});
