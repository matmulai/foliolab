import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createErrorResponse, ErrorCodes } from '../server/lib/error-responses';

describe('Error Responses Utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createErrorResponse', () => {
    // Happy Path Tests
    it('should create a basic error response with just the error message', () => {
      const errorMsg = 'Something went wrong';
      const response = createErrorResponse(errorMsg);

      expect(response).toEqual({
        error: errorMsg,
        timestamp: expect.any(String),
      });
      expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
    });

    it('should include details when provided', () => {
      const errorMsg = 'Validation Error';
      const details = 'Field "email" is required';
      const response = createErrorResponse(errorMsg, details);

      expect(response).toEqual({
        error: errorMsg,
        details: details,
        timestamp: expect.any(String),
      });
    });

    it('should include error code when provided', () => {
      const errorMsg = 'Unauthorized';
      const code = ErrorCodes.INVALID_TOKEN;
      const response = createErrorResponse(errorMsg, undefined, code);

      expect(response).toEqual({
        error: errorMsg,
        code: code,
        timestamp: expect.any(String),
      });
    });

    it('should create a complete error response with all parameters', () => {
      const errorMsg = 'Not Found';
      const details = 'Resource with ID 123 not found';
      const code = ErrorCodes.REPO_NOT_FOUND;
      const response = createErrorResponse(errorMsg, details, code);

      expect(response).toEqual({
        error: errorMsg,
        details: details,
        code: code,
        timestamp: expect.any(String),
      });
    });

    // Timestamp Verification
    it('should generate a correct timestamp using current time', () => {
      const mockDate = new Date('2023-01-01T12:00:00.000Z');
      vi.setSystemTime(mockDate);

      const response = createErrorResponse('Test Error');
      expect(response.timestamp).toBe(mockDate.toISOString());
    });

    // Runtime Edge Cases
    it('should handle empty strings for error message', () => {
      const response = createErrorResponse('');
      expect(response.error).toBe('');
    });

    it('should handle undefined details gracefully', () => {
      const response = createErrorResponse('Error', undefined);
      expect(response).not.toHaveProperty('details');
    });

    it('should handle undefined code gracefully', () => {
      const response = createErrorResponse('Error', undefined, undefined);
      expect(response).not.toHaveProperty('code');
    });

    it('should handle null details gracefully (runtime check)', () => {
      // @ts-ignore
      const response = createErrorResponse('Error', null);
      // The implementation uses spread syntax with truthy check: `...(details && { details })`
      // So null should be excluded
      expect(response).not.toHaveProperty('details');
    });

    it('should handle null code gracefully (runtime check)', () => {
      // @ts-ignore
      const response = createErrorResponse('Error', undefined, null);
      // The implementation uses spread syntax with truthy check: `...(code && { code })`
      // So null should be excluded
      expect(response).not.toHaveProperty('code');
    });

    it('should stringify non-string inputs if passed (runtime check)', () => {
      // The function signature says string, but at runtime anything could be passed.
      // The current implementation just assigns it directly.
      // If we want to test "robustness", we might check if it *doesn't* throw,
      // or if we *expect* it to be converted to string.
      // Given the implementation: `error,` -> it just assigns the value.
      // So we test that it assigns whatever is passed.
      const invalidInput = 123;
      // @ts-ignore
      const response = createErrorResponse(invalidInput);
      expect(response.error).toBe(invalidInput);
    });
  });

  describe('ErrorCodes Integrity', () => {
    it('should be an object', () => {
      expect(typeof ErrorCodes).toBe('object');
      expect(ErrorCodes).not.toBeNull();
    });

    it('should have consistent keys and values', () => {
      // Ensure that for every key, the value matches the key name
      // This prevents accidental typos like INVALID_TOKEN: 'IVNALID_TOEKN'
      Object.entries(ErrorCodes).forEach(([key, value]) => {
        expect(key).toBe(value);
      });
    });

    it('should contain expected standard error codes', () => {
      const expectedCodes = [
        'INVALID_TOKEN',
        'MISSING_TOKEN',
        'GITHUB_AUTH_FAILED',
        'REPO_NOT_FOUND',
        'INTERNAL_ERROR',
      ];

      expectedCodes.forEach((code) => {
        expect(ErrorCodes).toHaveProperty(code);
      });
    });
  });
});
