import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getGitHubToken, saveGitHubToken, removeGitHubToken } from '../client/src/lib/storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock global localStorage
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('GitHub Token Migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // afterEach is not needed since beforeEach clears localStorage

  it('should return null when no token exists', () => {
    const token = getGitHubToken();
    expect(token).toBeNull();
  });

  it('should return token from new key when it exists', () => {
    const testToken = 'new-token-123';
    localStorage.setItem('foliolab_github_token', testToken);
    
    const token = getGitHubToken();
    expect(token).toBe(testToken);
  });

  it('should migrate token from old key to new key', () => {
    const testToken = 'old-token-456';
    localStorage.setItem('github_token', testToken);
    
    // Verify old token exists
    expect(localStorage.getItem('github_token')).toBe(testToken);
    expect(localStorage.getItem('foliolab_github_token')).toBeNull();
    
    // Get token should migrate it
    const token = getGitHubToken();
    expect(token).toBe(testToken);
    
    // Verify migration happened
    expect(localStorage.getItem('foliolab_github_token')).toBe(testToken);
    expect(localStorage.getItem('github_token')).toBeNull();
  });

  it('should prefer new key over old key when both exist', () => {
    const oldToken = 'old-token-789';
    const newToken = 'new-token-abc';
    
    localStorage.setItem('github_token', oldToken);
    localStorage.setItem('foliolab_github_token', newToken);
    
    const token = getGitHubToken();
    expect(token).toBe(newToken);
    
    // Old token should still exist since new token was found first
    expect(localStorage.getItem('github_token')).toBe(oldToken);
  });

  it('should save token with new key', () => {
    const testToken = 'saved-token-def';
    saveGitHubToken(testToken);
    
    expect(localStorage.getItem('foliolab_github_token')).toBe(testToken);
    expect(localStorage.getItem('github_token')).toBeNull();
  });

  it('should remove both old and new tokens', () => {
    const oldToken = 'old-remove-token';
    const newToken = 'new-remove-token';
    
    localStorage.setItem('github_token', oldToken);
    localStorage.setItem('foliolab_github_token', newToken);
    
    removeGitHubToken();
    
    expect(localStorage.getItem('github_token')).toBeNull();
    expect(localStorage.getItem('foliolab_github_token')).toBeNull();
  });

  it('should handle multiple migrations correctly', () => {
    const testToken = 'migration-test-token';
    
    // Set old token
    localStorage.setItem('github_token', testToken);
    
    // First call should migrate
    let token = getGitHubToken();
    expect(token).toBe(testToken);
    expect(localStorage.getItem('foliolab_github_token')).toBe(testToken);
    expect(localStorage.getItem('github_token')).toBeNull();
    
    // Second call should use new key directly
    token = getGitHubToken();
    expect(token).toBe(testToken);
  });
});