import { describe, it, expect } from 'vitest';
import { isOctokitError } from '../server/lib/github.js';

describe('isOctokitError', () => {
  it('should return true when error has status property', () => {
    const error = new Error('Not Found');
    Object.assign(error, { status: 404 });
    expect(isOctokitError(error)).toBe(true);
  });

  it('should return true when error has response object', () => {
    const error = new Error('Server Error');
    Object.assign(error, {
      response: {
        status: 500,
        data: { message: 'Internal Server Error' }
      }
    });
    expect(isOctokitError(error)).toBe(true);
  });

  it('should return false for standard Error object', () => {
    const error = new Error('Standard Error');
    expect(isOctokitError(error)).toBe(false);
  });

  it('should return false when response is null', () => {
    const error = new Error('Error with null response');
    Object.assign(error, { response: null });
    expect(isOctokitError(error)).toBe(false);
  });

  it('should return false when response is not an object', () => {
    const error = new Error('Error with string response');
    Object.assign(error, { response: 'invalid response' });
    expect(isOctokitError(error)).toBe(false);
  });

  it('should return false for non-Error objects', () => {
    expect(isOctokitError({ status: 404 })).toBe(false);
    expect(isOctokitError('error string')).toBe(false);
    expect(isOctokitError(123)).toBe(false);
    expect(isOctokitError(null)).toBe(false);
    expect(isOctokitError(undefined)).toBe(false);
  });

  it('should return false if error is not an instance of Error even if it has status', () => {
    const errorLike = { message: 'Error', status: 404 };
    expect(isOctokitError(errorLike)).toBe(false);
  });
});
