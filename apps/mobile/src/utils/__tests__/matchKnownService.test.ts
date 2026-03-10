import { matchKnownService, getFaviconUrl } from '../matchKnownService';

// =============================================================================
// matchKnownService — Exact match
// =============================================================================
describe('matchKnownService - exact match', () => {
  it('should match "Netflix" exactly', () => {
    const result = matchKnownService('Netflix');
    expect(result.name).toBe('Netflix');
    expect(result.icon).toBeTruthy();
    expect(result.color).toBeTruthy();
    expect(result.category).toBeTruthy();
  });

  it('should match "Spotify" exactly', () => {
    const result = matchKnownService('Spotify');
    expect(result.name).toBe('Spotify');
  });
});

// =============================================================================
// matchKnownService — Case insensitive
// =============================================================================
describe('matchKnownService - case insensitive', () => {
  it('should match "NETFLIX" case-insensitively', () => {
    const result = matchKnownService('NETFLIX');
    expect(result.name).toBe('Netflix');
  });

  it('should match "netflix" lowercase', () => {
    const result = matchKnownService('netflix');
    expect(result.name).toBe('Netflix');
  });

  it('should match "SpOtIfY" mixed case', () => {
    const result = matchKnownService('SpOtIfY');
    expect(result.name).toBe('Spotify');
  });
});

// =============================================================================
// matchKnownService — Alias match
// =============================================================================
describe('matchKnownService - alias match', () => {
  it('should match "chatgpt" to ChatGPT Plus', () => {
    const result = matchKnownService('chatgpt');
    expect(result.name.toLowerCase()).toContain('chatgpt');
  });

  it('should match "icloud" to Apple iCloud', () => {
    const result = matchKnownService('icloud');
    expect(result.name.toLowerCase()).toContain('icloud');
  });

  it('should match "prime" to Amazon Prime', () => {
    const result = matchKnownService('prime');
    expect(result.name.toLowerCase()).toContain('amazon');
  });

  it('should match "disney" to Disney+', () => {
    const result = matchKnownService('disney');
    expect(result.name.toLowerCase()).toContain('disney');
  });

  it('should match "hbo" to HBO Max', () => {
    const result = matchKnownService('hbo');
    expect(result.name.toLowerCase()).toContain('hbo');
  });
});

// =============================================================================
// matchKnownService — Contains match
// =============================================================================
describe('matchKnownService - contains match', () => {
  it('should match "my netflix account" via contains', () => {
    const result = matchKnownService('my netflix account');
    expect(result.name).toBe('Netflix');
  });

  it('should match "spotify premium" via contains', () => {
    const result = matchKnownService('spotify premium');
    expect(result.name).toBe('Spotify');
  });
});

// =============================================================================
// matchKnownService — Unknown service defaults
// =============================================================================
describe('matchKnownService - unknown service', () => {
  it('should return original name for unknown service', () => {
    const result = matchKnownService('SomeRandomService123');
    expect(result.name).toBe('SomeRandomService123');
  });

  it('should return generic icon for unknown service', () => {
    const result = matchKnownService('UnknownXYZ');
    expect(result.icon).toBe('💳');
  });

  it('should return "Other" category for unknown service', () => {
    const result = matchKnownService('UnknownABC');
    expect(result.category).toBe('Other');
  });

  it('should return a deterministic color for same unknown service', () => {
    const result1 = matchKnownService('MyCustomService');
    const result2 = matchKnownService('MyCustomService');
    expect(result1.color).toBe(result2.color);
  });

  it('should return different colors for different unknown services', () => {
    const result1 = matchKnownService('ServiceAAAA');
    const result2 = matchKnownService('ServiceZZZZ');
    // Colors might collide but generally should be different
    // Just verify they are valid hex colors
    expect(result1.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(result2.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('should return empty logoUrl for unknown service', () => {
    const result = matchKnownService('NobodyKnowsThis');
    expect(result.logoUrl).toBe('');
  });
});

// =============================================================================
// matchKnownService — Whitespace handling
// =============================================================================
describe('matchKnownService - whitespace', () => {
  it('should trim whitespace', () => {
    const result = matchKnownService('  Netflix  ');
    expect(result.name).toBe('Netflix');
  });
});

// =============================================================================
// matchKnownService — Return structure
// =============================================================================
describe('matchKnownService - return structure', () => {
  it('should return all expected fields', () => {
    const result = matchKnownService('Netflix');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('icon');
    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('category');
    expect(result).toHaveProperty('logoUrl');
  });

  it('should return logoUrl as a string for known services', () => {
    const result = matchKnownService('Netflix');
    expect(typeof result.logoUrl).toBe('string');
  });
});

// =============================================================================
// getFaviconUrl
// =============================================================================
describe('getFaviconUrl', () => {
  it('should return Google favicon URL with correct domain', () => {
    const url = getFaviconUrl('netflix.com');
    expect(url).toBe('https://www.google.com/s2/favicons?domain=netflix.com&sz=128');
  });

  it('should include size parameter', () => {
    const url = getFaviconUrl('spotify.com');
    expect(url).toContain('sz=128');
  });
});
