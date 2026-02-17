import { describe, it, expect } from 'vitest';
import { extractMediumUsername, getMediumRSSUrl } from '../server/lib/medium';

describe('Medium Integration Tests', () => {
  describe('extractMediumUsername', () => {
    it('should return username as-is if it starts with @', () => {
      expect(extractMediumUsername('@username')).toBe('@username');
    });

    it('should extract username from medium.com/@username URL', () => {
      expect(extractMediumUsername('https://medium.com/@username')).toBe('@username');
    });

    it('should extract username from medium.com/feed/@username URL', () => {
      expect(extractMediumUsername('https://medium.com/feed/@username')).toBe('@username');
    });

    it('should extract username if only @username is present in string', () => {
      expect(extractMediumUsername('Check out @username on Medium')).toBe('@username');
    });

    it('should assume input is username if no @ or URL structure found', () => {
      expect(extractMediumUsername('username')).toBe('@username');
    });

    it('should handle whitespace around input', () => {
      expect(extractMediumUsername('  username  ')).toBe('@username');
    });

    // Edge cases
    it('should return null for empty string', () => {
      expect(extractMediumUsername('')).toBe(null);
    });

    it('should return null for string with just spaces', () => {
      expect(extractMediumUsername('   ')).toBe(null);
    });

    it('should return null for URL without username pattern', () => {
      expect(extractMediumUsername('https://medium.com')).toBe(null);
    });

    it('should extract username from complex string correctly', () => {
        // "Check out @username on Medium" -> "@username"
        // Previous buggy behavior was "@username on Medium"
        expect(extractMediumUsername('Check out @username on Medium')).toBe('@username');
    });
  });

  describe('getMediumRSSUrl', () => {
    it('should generate RSS URL for username without @', () => {
      expect(getMediumRSSUrl('username')).toBe('https://medium.com/feed/@username');
    });

    it('should generate RSS URL for username with @', () => {
      expect(getMediumRSSUrl('@username')).toBe('https://medium.com/feed/@username');
    });
  });
});
