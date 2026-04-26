
import { describe, it, expect } from 'vitest';
import { safeJsonStringify, redactSensitiveData } from '../server/lib/security';

describe('safeJsonStringify', () => {
  it('should stringify simple objects correctly', () => {
    const obj = { key: 'value', number: 123, bool: true };
    const result = safeJsonStringify(obj);
    expect(result).toBe(JSON.stringify(obj));
  });

  it('should escape <script> tags', () => {
    const obj = { malicious: '<script>alert(1)</script>' };
    const result = safeJsonStringify(obj);
    expect(result).toContain('\\u003cscript\\u003e');
    expect(result).toContain('\\u003c/script\\u003e');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
  });

  it('should escape HTML entities', () => {
    const obj = { html: '<div>&span</div>' };
    const result = safeJsonStringify(obj);
    expect(result).toContain('\\u003cdiv\\u003e');
    expect(result).toContain('\\u0026span');
    expect(result).toContain('\\u003c/div\\u003e');
  });

  it('should be valid JSON when parsed', () => {
    const obj = {
      script: '<script>alert(1)</script>',
      html: '<b>bold</b>',
      amp: 'Fish & Chips'
    };
    const result = safeJsonStringify(obj);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(obj);
  });

  it('should handle arrays', () => {
    const arr = ['<foo>', '&bar'];
    const result = safeJsonStringify(arr);
    expect(result).toContain('\\u003cfoo\\u003e');
    expect(result).toContain('\\u0026bar');
    expect(JSON.parse(result)).toEqual(arr);
  });

  it('should handle complex nested objects', () => {
    const complex = {
      a: {
        b: [
          { c: '<script>' }
        ]
      }
    };
    const result = safeJsonStringify(complex);
    expect(result).toContain('\\u003cscript\\u003e');
    expect(JSON.parse(result)).toEqual(complex);
  });
});

describe('redactSensitiveData', () => {
  it('should not modify null or undefined', () => {
    expect(redactSensitiveData(null)).toBeNull();
    expect(redactSensitiveData(undefined)).toBeUndefined();
  });

  it('should not modify primitive types', () => {
    expect(redactSensitiveData('string')).toBe('string');
    expect(redactSensitiveData(123)).toBe(123);
    expect(redactSensitiveData(true)).toBe(true);
  });

  it('should preserve Date objects', () => {
    const d = new Date();
    expect(redactSensitiveData(d)).toBe(d);
  });

  it('should redact sensitive keys in flat objects', () => {
    const input = {
      username: 'jules',
      accessToken: 'secret_token_123',
      email: 'jules@example.com',
      publicInfo: 'hello'
    };
    const expected = {
      username: 'jules',
      accessToken: '[REDACTED]',
      email: '[REDACTED]',
      publicInfo: 'hello'
    };
    expect(redactSensitiveData(input)).toEqual(expected);
  });

  it('should redact sensitive keys in nested objects', () => {
    const input = {
      user: {
        name: 'jules',
        password: 'supersecretpassword',
        profile: {
          apiKey: 'api_key_123'
        }
      }
    };
    const expected = {
      user: {
        name: 'jules',
        password: '[REDACTED]',
        profile: {
          apiKey: '[REDACTED]'
        }
      }
    };
    expect(redactSensitiveData(input)).toEqual(expected);
  });

  it('should redact sensitive keys in arrays', () => {
    const input = [
      { id: 1, token: 'token1' },
      { id: 2, authorization: 'token2' }
    ];
    const expected = [
      { id: 1, token: '[REDACTED]' },
      { id: 2, authorization: '[REDACTED]' }
    ];
    expect(redactSensitiveData(input)).toEqual(expected);
  });
});
