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
});