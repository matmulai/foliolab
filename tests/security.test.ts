
import { describe, it, expect } from 'vitest';
import { redactSensitiveData } from '../server/lib/security';

describe('redactSensitiveData', () => {
  it('should redact sensitive keys in a flat object', () => {
    const input = {
      username: 'testuser',
      accessToken: 'secret_token_123',
      publicInfo: 'public'
    };
    const expected = {
      username: 'testuser',
      accessToken: '[REDACTED]',
      publicInfo: 'public'
    };
    expect(redactSensitiveData(input)).toEqual(expected);
  });

  it('should redact sensitive keys regardless of case', () => {
    const input = {
      access_token: '123',
      AccessToken: '456',
      ACCESS_TOKEN: '789'
    };
    // The keys are preserved, values are redacted
    const output = redactSensitiveData(input);
    expect(output.access_token).toBe('[REDACTED]');
    expect(output.AccessToken).toBe('[REDACTED]');
    expect(output.ACCESS_TOKEN).toBe('[REDACTED]');
  });

  it('should handle nested objects recursively', () => {
    const input = {
      user: {
        profile: {
          name: 'John',
          secrets: {
            password: 'password123'
          }
        }
      }
    };
    const output = redactSensitiveData(input);
    expect(output.user.profile.secrets.password).toBe('[REDACTED]');
    expect(output.user.profile.name).toBe('John');
  });

  it('should handle arrays of objects', () => {
    const input = [
      { id: 1, token: 'abc' },
      { id: 2, token: 'def' }
    ];
    const output = redactSensitiveData(input);
    expect(output[0].token).toBe('[REDACTED]');
    expect(output[1].token).toBe('[REDACTED]');
    expect(output[0].id).toBe(1);
  });

  it('should handle null and undefined', () => {
    expect(redactSensitiveData(null)).toBeNull();
    expect(redactSensitiveData(undefined)).toBeUndefined();
  });

  it('should handle primitives', () => {
    expect(redactSensitiveData(123)).toBe(123);
    expect(redactSensitiveData('string')).toBe('string');
    expect(redactSensitiveData(true)).toBe(true);
  });

  it('should handle non-sensitive data correctly', () => {
    const input = {
      name: 'Project',
      description: 'A project',
      tags: ['one', 'two'],
      count: 42
    };
    expect(redactSensitiveData(input)).toEqual(input);
  });

  it('should handle specific sensitive keys from the vulnerability', () => {
    const input = {
      repositories: [],
      accessToken: 'gho_1234567890',
      refreshToken: 'r_1234567890',
      client_secret: 'secret_key',
      appPassword: 'password123'
    };
    const output = redactSensitiveData(input);
    expect(output.accessToken).toBe('[REDACTED]');
    expect(output.refreshToken).toBe('[REDACTED]');
    expect(output.client_secret).toBe('[REDACTED]');
    expect(output.appPassword).toBe('[REDACTED]');
    expect(output.repositories).toEqual([]);
  });
});
