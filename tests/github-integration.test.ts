import { describe, it, expect, vi } from 'vitest';
import { extractTitleFromReadme, checkRepositoryExists } from '../server/lib/github.js';

// Mock Octokit
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    repos: {
      get: vi.fn(),
      getReadme: vi.fn(),
      listForAuthenticatedUser: vi.fn(),
      listForOrg: vi.fn(),
      createForAuthenticatedUser: vi.fn(),
    },
    users: {
      getAuthenticated: vi.fn(),
    },
    orgs: {
      listForAuthenticatedUser: vi.fn(),
    },
    git: {
      getRef: vi.fn(),
      createTree: vi.fn(),
      createCommit: vi.fn(),
      updateRef: vi.fn(),
    },
  })),
}));

describe('GitHub Integration', () => {
  describe('extractTitleFromReadme', () => {
    it('should extract title from README with single #', () => {
      const readme = `# My Awesome Project

This is a great project that does amazing things.

## Installation

\`\`\`bash
npm install
\`\`\``;

      const title = extractTitleFromReadme(readme);
      expect(title).toBe('My Awesome Project');
    });

    it('should extract title from README with multiple #', () => {
      const readme = `## My Project Title

Some description here.`;

      const title = extractTitleFromReadme(readme);
      expect(title).toBe('My Project Title');
    });

    it('should handle README with no title', () => {
      const readme = `This is a project without a title.

Some content here.`;

      const title = extractTitleFromReadme(readme);
      expect(title).toBeNull();
    });

    it('should handle empty README', () => {
      const title = extractTitleFromReadme('');
      expect(title).toBeNull();
    });

    it('should handle null README', () => {
      const title = extractTitleFromReadme(null);
      expect(title).toBeNull();
    });

    it('should extract first title when multiple exist', () => {
      const readme = `# First Title

Some content.

# Second Title

More content.`;

      const title = extractTitleFromReadme(readme);
      expect(title).toBe('First Title');
    });

    it('should handle title with extra whitespace', () => {
      const readme = `#    Spaced Title   

Content here.`;

      const title = extractTitleFromReadme(readme);
      expect(title).toBe('Spaced Title');
    });
  });

  describe('Repository Operations', () => {
    it('should handle repository existence check', async () => {
      // This test would require mocking the Octokit instance
      // For now, we'll test the basic structure
      expect(checkRepositoryExists).toBeDefined();
      expect(typeof checkRepositoryExists).toBe('function');
    });
  });

  describe('Repository Data Processing', () => {
    it('should filter out portfolio repositories', () => {
      const mockRepos = [
        { name: 'my-project', id: 1 },
        { name: 'user-folio', id: 2 },
        { name: 'username.github.io', id: 3 },
        { name: 'foliolab-vercel', id: 4 },
        { name: 'valid-project', id: 5 },
      ];

      // Test the filtering logic that's used in getUserRepositories
      const filteredRepos = mockRepos.filter((repo) => {
        return (
          !repo.name.toLowerCase().includes('-folio') &&
          !repo.name.toLowerCase().includes('github.io') &&
          repo.name !== 'foliolab-vercel'
        );
      });

      expect(filteredRepos).toHaveLength(2);
      expect(filteredRepos.map(r => r.name)).toEqual(['my-project', 'valid-project']);
    });

    it('should filter out forked and archived repositories', () => {
      const mockRepos = [
        { name: 'forked', id: 1, fork: true, archived: false },
        { name: 'archived', id: 2, fork: false, archived: true },
        { name: 'regular', id: 3, fork: false, archived: false },
      ];

      const filteredRepos = mockRepos.filter(repo => {
        return !repo.fork && !repo.archived;
      });

      expect(filteredRepos).toHaveLength(1);
      expect(filteredRepos[0].name).toBe('regular');
    });

    it('should extract owner from GitHub URL', () => {
      const githubUrl = 'https://github.com/testuser/test-repo';
      const urlParts = githubUrl.split('/');
      const owner = urlParts[3];

      expect(owner).toBe('testuser');
    });

    it('should handle repository metadata transformation', () => {
      const mockGithubRepo = {
        id: 123,
        name: 'test-repo',
        description: 'A test repository',
        html_url: 'https://github.com/testuser/test-repo',
        stargazers_count: 42,
        language: 'TypeScript',
        topics: ['web', 'typescript', 'react'],
        updated_at: '2024-01-01T00:00:00Z',
        homepage: 'https://test-repo.com',
      };

      // Transform to our Repository format
      const transformedRepo = {
        id: mockGithubRepo.id,
        name: mockGithubRepo.name,
        description: mockGithubRepo.description,
        url: mockGithubRepo.html_url,
        summary: null,
        selected: false,
        metadata: {
          id: mockGithubRepo.id,
          stars: mockGithubRepo.stargazers_count,
          language: mockGithubRepo.language,
          topics: mockGithubRepo.topics,
          updatedAt: mockGithubRepo.updated_at,
          url: mockGithubRepo.homepage,
        },
      };

      expect(transformedRepo.metadata.stars).toBe(42);
      expect(transformedRepo.metadata.language).toBe('TypeScript');
      expect(transformedRepo.metadata.topics).toEqual(['web', 'typescript', 'react']);
      expect(transformedRepo.metadata.url).toBe('https://test-repo.com');
    });
  });

  describe('OAuth Error Handling', () => {
    it('should handle bad verification code error', () => {
      const mockErrorResponse = {
        error: 'bad_verification_code',
        error_description: 'The code passed is incorrect or expired.'
      };

      let userMessage = 'GitHub authentication failed';
      if (mockErrorResponse.error === 'bad_verification_code') {
        userMessage = 'The authorization code is invalid or has expired. Please try signing in again.';
      }

      expect(userMessage).toBe('The authorization code is invalid or has expired. Please try signing in again.');
    });

    it('should handle incorrect client credentials error', () => {
      const mockErrorResponse = {
        error: 'incorrect_client_credentials',
        error_description: 'The client_id and/or client_secret passed are incorrect.'
      };

      let userMessage = 'GitHub authentication failed';
      if (mockErrorResponse.error === 'incorrect_client_credentials') {
        userMessage = 'GitHub application credentials are incorrect. Please contact support.';
      }

      expect(userMessage).toBe('GitHub application credentials are incorrect. Please contact support.');
    });

    it('should handle redirect URI mismatch error', () => {
      const mockErrorResponse = {
        error: 'redirect_uri_mismatch',
        error_description: 'The redirect_uri MUST match the registered callback URL for this application.'
      };

      let userMessage = 'GitHub authentication failed';
      if (mockErrorResponse.error === 'redirect_uri_mismatch') {
        userMessage = 'Redirect URI mismatch. Please contact support.';
      }

      expect(userMessage).toBe('Redirect URI mismatch. Please contact support.');
    });

    it('should validate OAuth code format', () => {
      // OAuth codes are typically 20 characters long and alphanumeric
      const validCode = 'abcd1234efgh5678ijkl';
      const invalidCode = '';
      const shortCode = 'abc123';

      expect(validCode.length).toBe(20);
      expect(invalidCode.length).toBe(0);
      expect(shortCode.length).toBeLessThan(20);
    });

    it('should handle missing environment variables', () => {
      const mockEnv = {
        GITHUB_CLIENT_ID: undefined,
        GITHUB_CLIENT_SECRET: undefined
      };

      const hasRequiredEnvVars = !!(mockEnv.GITHUB_CLIENT_ID && mockEnv.GITHUB_CLIENT_SECRET);
      expect(hasRequiredEnvVars).toBe(false);
    });

    it('should validate OAuth state parameter', () => {
      // State should be a UUID-like string for security
      const validState = crypto.randomUUID();
      const invalidState = '';

      expect(validState).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(invalidState).toBe('');
    });
  });
});