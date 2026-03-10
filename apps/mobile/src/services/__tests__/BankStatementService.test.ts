import { validateFile, checkScanLimits, recordScan, getRemainingScans } from '../BankStatementService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// validateFile
// =============================================================================
describe('validateFile', () => {
  // Generate a base64 string of approximately the given size in KB
  function makeBase64(sizeKB: number, prefix: string = 'JVBERi'): string {
    const targetLen = Math.ceil((sizeKB * 1024 * 4) / 3);
    return prefix + 'A'.repeat(Math.max(0, targetLen - prefix.length));
  }

  it('should reject files smaller than 5KB', () => {
    const tinyBase64 = 'JVBERiAA'; // ~6 bytes
    const result = validateFile(tinyBase64, 'application/pdf');
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe('bankScan.errors.tooSmall');
  });

  it('should reject files larger than 7MB', () => {
    const hugeBase64 = makeBase64(8 * 1024); // 8MB
    const result = validateFile(hugeBase64, 'application/pdf');
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe('bankScan.errors.tooLarge');
  });

  it('should accept valid PDF within size limits', () => {
    const validPdf = makeBase64(100); // 100KB PDF
    const result = validateFile(validPdf, 'application/pdf');
    expect(result.valid).toBe(true);
  });

  it('should reject unsupported MIME type', () => {
    const content = makeBase64(100);
    const result = validateFile(content, 'text/plain');
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe('bankScan.errors.unsupportedFormat');
  });

  it('should reject PDF with wrong magic bytes', () => {
    const content = makeBase64(100, 'AAAA'); // Not a PDF prefix
    const result = validateFile(content, 'application/pdf');
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe('bankScan.errors.invalidPdf');
  });

  it('should accept valid PNG image', () => {
    const png = makeBase64(100, 'iVBOR'); // PNG magic bytes
    const result = validateFile(png, 'image/png');
    expect(result.valid).toBe(true);
  });

  it('should accept valid JPEG image', () => {
    const jpeg = makeBase64(100, '/9j/'); // JPEG magic bytes
    const result = validateFile(jpeg, 'image/jpeg');
    expect(result.valid).toBe(true);
  });

  it('should reject image with wrong magic bytes', () => {
    const content = makeBase64(100, 'XXXX');
    const result = validateFile(content, 'image/png');
    expect(result.valid).toBe(false);
    expect(result.errorKey).toBe('bankScan.errors.invalidImage');
  });
});

// =============================================================================
// checkScanLimits
// =============================================================================
describe('checkScanLimits', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should allow scan when no previous scans', async () => {
    const result = await checkScanLimits();
    expect(result.allowed).toBe(true);
    expect(result.remainingToday).toBe(5);
    expect(result.remainingMonth).toBe(30);
  });

  it('should block when daily limit reached', async () => {
    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7);
    await AsyncStorage.setItem('bank_scan_usage', JSON.stringify({
      dailyCount: 5,
      monthlyCount: 5,
      lastScanDate: today,
      lastScanMonth: month,
      lastScanTimestamp: 0,
    }));

    const result = await checkScanLimits();
    expect(result.allowed).toBe(false);
    expect(result.remainingToday).toBe(0);
  });

  it('should block when monthly limit reached', async () => {
    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7);
    await AsyncStorage.setItem('bank_scan_usage', JSON.stringify({
      dailyCount: 0,
      monthlyCount: 30,
      lastScanDate: today,
      lastScanMonth: month,
      lastScanTimestamp: 0,
    }));

    const result = await checkScanLimits();
    expect(result.allowed).toBe(false);
    expect(result.remainingMonth).toBe(0);
  });

  it('should block during cooldown period', async () => {
    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7);
    await AsyncStorage.setItem('bank_scan_usage', JSON.stringify({
      dailyCount: 1,
      monthlyCount: 1,
      lastScanDate: today,
      lastScanMonth: month,
      lastScanTimestamp: Date.now() - 5000, // 5 seconds ago (within 30s cooldown)
    }));

    const result = await checkScanLimits();
    expect(result.allowed).toBe(false);
    expect(result.cooldownRemaining).toBeGreaterThan(0);
  });

  it('should reset daily count on new day', async () => {
    await AsyncStorage.setItem('bank_scan_usage', JSON.stringify({
      dailyCount: 5,
      monthlyCount: 5,
      lastScanDate: '2025-01-01', // old date
      lastScanMonth: new Date().toISOString().split('T')[0].substring(0, 7),
      lastScanTimestamp: 0,
    }));

    const result = await checkScanLimits();
    expect(result.allowed).toBe(true);
    expect(result.remainingToday).toBe(5);
  });
});

// =============================================================================
// recordScan
// =============================================================================
describe('recordScan', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should increment daily and monthly counters', async () => {
    await recordScan();

    const raw = await AsyncStorage.getItem('bank_scan_usage');
    const usage = JSON.parse(raw!);
    expect(usage.dailyCount).toBe(1);
    expect(usage.monthlyCount).toBe(1);
  });

  it('should update timestamp', async () => {
    const before = Date.now();
    await recordScan();
    const after = Date.now();

    const raw = await AsyncStorage.getItem('bank_scan_usage');
    const usage = JSON.parse(raw!);
    expect(usage.lastScanTimestamp).toBeGreaterThanOrEqual(before);
    expect(usage.lastScanTimestamp).toBeLessThanOrEqual(after);
  });
});

// =============================================================================
// getRemainingScans
// =============================================================================
describe('getRemainingScans', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should return max limits when no scans done', async () => {
    const result = await getRemainingScans();
    expect(result.today).toBe(5);
    expect(result.month).toBe(30);
  });

  it('should decrement after a scan', async () => {
    await recordScan();
    const result = await getRemainingScans();
    expect(result.today).toBe(4);
    expect(result.month).toBe(29);
  });
});
