describe('Test setup', () => {
  it('should run tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should resolve @/ path alias', () => {
    // This verifies the moduleNameMapper works
    const types = require('@/types');
    expect(types).toBeDefined();
  });
});
