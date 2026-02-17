import { describe, it, expect } from 'vitest';
import { FRAMEWORK_PATTERNS } from '../server/config/framework-patterns.js';

describe('Framework Patterns Configuration', () => {
  it('should export FRAMEWORK_PATTERNS object', () => {
    expect(FRAMEWORK_PATTERNS).toBeDefined();
    expect(typeof FRAMEWORK_PATTERNS).toBe('object');
  });

  it('should contain expected frameworks', () => {
    const frameworks = Object.keys(FRAMEWORK_PATTERNS);
    expect(frameworks).toContain('React');
    expect(frameworks).toContain('Next.js');
    expect(frameworks).toContain('Vue.js');
    expect(frameworks).toContain('Express.js');
  });

  it('should have correct structure for React', () => {
    const reactPattern = FRAMEWORK_PATTERNS['React'];
    expect(reactPattern).toBeDefined();
    expect(reactPattern.files).toContain('package.json');
    expect(reactPattern.dependencies).toContain('react');
  });
});
