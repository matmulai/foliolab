import { describe, it, expect } from 'vitest';
import { getVercelHeaders } from '../server/lib/vercel';

describe('getVercelHeaders', () => {
  it('should return Authorization header with just accessToken', () => {
    const accessToken = 'test-token';
    const headers = getVercelHeaders(accessToken);
    expect(headers).toEqual({
      'Authorization': 'Bearer test-token'
    });
  });

  it('should return Authorization and Team ID headers when teamId is provided', () => {
    const accessToken = 'test-token';
    const teamId = 'team-123';
    const headers = getVercelHeaders(accessToken, teamId);
    expect(headers).toEqual({
      'Authorization': 'Bearer test-token',
      'X-Vercel-Team-Id': 'team-123'
    });
  });

  it('should not include Team ID header if teamId is empty string', () => {
    const accessToken = 'test-token';
    const headers = getVercelHeaders(accessToken, '');
    expect(headers).toEqual({
      'Authorization': 'Bearer test-token'
    });
  });

  it('should not include Team ID header if teamId is undefined', () => {
    const accessToken = 'test-token';
    const headers = getVercelHeaders(accessToken, undefined);
    expect(headers).toEqual({
      'Authorization': 'Bearer test-token'
    });
  });
});
