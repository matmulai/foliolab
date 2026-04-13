
import { describe, it, expect } from 'vitest';
import { safeJsonStringify } from '../server/lib/security';

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
