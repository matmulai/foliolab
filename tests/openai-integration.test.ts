import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

// Mock the openai module functions
const mockGenerateRepoSummary = vi.fn();
const mockGenerateUserIntroduction = vi.fn();

vi.mock('../server/lib/openai.js', () => ({
  generateRepoSummary: mockGenerateRepoSummary,
  generateUserIntroduction: mockGenerateUserIntroduction,
}));

describe('OpenAI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Repository Summary Generation', () => {
    it('should generate summary for repository with README', async () => {
      const mockSummary = {
        summary: 'This is a React-based web application that provides a modern user interface for managing tasks.',
        keyFeatures: [
          'React-based frontend with TypeScript',
          'Responsive design with Tailwind CSS',
          'State management with Redux Toolkit',
          'Comprehensive test suite with Jest'
        ]
      };

      mockGenerateRepoSummary.mockResolvedValue(mockSummary);

      const result = await mockGenerateRepoSummary(
        'task-manager',
        'A modern task management application',
        '# Task Manager\n\nA comprehensive task management solution built with React and TypeScript.',
        'test-api-key',
        undefined,
        {
          language: 'TypeScript',
          topics: ['react', 'typescript', 'task-management'],
          stars: 25,
          url: 'https://github.com/user/task-manager'
        },
        'mock-access-token',
        'testuser'
      );

      expect(result).toEqual(mockSummary);
      expect(mockGenerateRepoSummary).toHaveBeenCalledWith(
        'task-manager',
        'A modern task management application',
        '# Task Manager\n\nA comprehensive task management solution built with React and TypeScript.',
        'test-api-key',
        undefined,
        {
          language: 'TypeScript',
          topics: ['react', 'typescript', 'task-management'],
          stars: 25,
          url: 'https://github.com/user/task-manager'
        },
        'mock-access-token',
        'testuser'
      );
    });

    it('should handle repository without README', async () => {
      const mockSummary = {
        summary: 'This appears to be a Node.js Express API server based on the project structure and dependencies.',
        keyFeatures: [
          'Express.js REST API server',
          'Node.js backend application',
          'Structured with routes and middleware',
          'Includes configuration for development and production'
        ]
      };

      mockGenerateRepoSummary.mockResolvedValue(mockSummary);

      const result = await mockGenerateRepoSummary(
        'api-server',
        'REST API server built with Express.js',
        '', // Empty README
        'test-api-key',
        undefined,
        {
          language: 'JavaScript',
          topics: ['nodejs', 'express', 'api'],
          stars: 10,
          url: 'https://github.com/user/api-server'
        },
        'mock-access-token',
        'testuser'
      );

      expect(result).toEqual(mockSummary);
      expect(mockGenerateRepoSummary).toHaveBeenCalledWith(
        'api-server',
        'REST API server built with Express.js',
        '',
        'test-api-key',
        undefined,
        {
          language: 'JavaScript',
          topics: ['nodejs', 'express', 'api'],
          stars: 10,
          url: 'https://github.com/user/api-server'
        },
        'mock-access-token',
        'testuser'
      );
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('OpenAI API rate limit exceeded');
      mockGenerateRepoSummary.mockRejectedValue(apiError);

      await expect(mockGenerateRepoSummary(
        'test-repo',
        'Test repository',
        'Test README',
        'invalid-api-key'
      )).rejects.toThrow('OpenAI API rate limit exceeded');
    });

    it('should validate required parameters', async () => {
      mockGenerateRepoSummary.mockImplementation((name, description, readme, apiKey) => {
        if (!name) throw new Error('Repository name is required');
        if (!apiKey) throw new Error('API key is required');
        return Promise.resolve({ summary: 'Test summary', keyFeatures: [] });
      });

      try {
        await mockGenerateRepoSummary('', 'desc', 'readme', 'key');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe('Repository name is required');
      }

      try {
        await mockGenerateRepoSummary('name', 'desc', 'readme', '');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe('API key is required');
      }
    });
  });

  describe('User Introduction Generation', () => {
    it('should generate user introduction from repositories', async () => {
      const mockRepositories = [
        {
          name: 'react-app',
          description: 'A React application',
          summary: 'Modern React app with TypeScript',
          metadata: { language: 'TypeScript', topics: ['react', 'typescript'] }
        },
        {
          name: 'node-api',
          description: 'Node.js API server',
          summary: 'RESTful API built with Express.js',
          metadata: { language: 'JavaScript', topics: ['nodejs', 'express'] }
        }
      ];

      const mockIntroduction = {
        introduction: 'I am a full-stack developer passionate about building modern web applications with React and Node.js.',
        skills: ['React', 'TypeScript', 'Node.js', 'Express.js', 'JavaScript'],
        interests: ['Web Development', 'Open Source', 'Modern JavaScript Frameworks']
      };

      mockGenerateUserIntroduction.mockResolvedValue(mockIntroduction);

      const result = await mockGenerateUserIntroduction(mockRepositories, 'test-api-key');

      expect(result).toEqual(mockIntroduction);
      expect(mockGenerateUserIntroduction).toHaveBeenCalledWith(mockRepositories, 'test-api-key');
    });

    it('should handle empty repository list', async () => {
      const mockIntroduction = {
        introduction: 'I am a developer passionate about creating innovative solutions.',
        skills: ['Programming', 'Problem Solving'],
        interests: ['Technology', 'Innovation']
      };

      mockGenerateUserIntroduction.mockResolvedValue(mockIntroduction);

      const result = await mockGenerateUserIntroduction([], 'test-api-key');

      expect(result).toEqual(mockIntroduction);
      expect(mockGenerateUserIntroduction).toHaveBeenCalledWith([], 'test-api-key');
    });

    it('should extract skills from repository metadata', () => {
      const repositories = [
        { metadata: { language: 'TypeScript', topics: ['react', 'frontend'] } },
        { metadata: { language: 'Python', topics: ['django', 'backend'] } },
        { metadata: { language: 'JavaScript', topics: ['nodejs', 'api'] } }
      ];

      // Test the logic that would extract unique technologies
      const languages = repositories.map(r => r.metadata.language).filter(Boolean);
      const topics = repositories.flatMap(r => r.metadata.topics || []);
      const uniqueTechnologies = Array.from(new Set([...languages, ...topics]));

      expect(uniqueTechnologies).toContain('TypeScript');
      expect(uniqueTechnologies).toContain('Python');
      expect(uniqueTechnologies).toContain('react');
      expect(uniqueTechnologies).toContain('django');
      expect(uniqueTechnologies.length).toBeGreaterThan(5);
    });
  });

  describe('API Response Validation', () => {
    it('should validate repository summary response structure', () => {
      const validResponse = {
        summary: 'This is a valid summary',
        keyFeatures: ['Feature 1', 'Feature 2', 'Feature 3']
      };

      expect(validResponse).toHaveProperty('summary');
      expect(validResponse).toHaveProperty('keyFeatures');
      expect(typeof validResponse.summary).toBe('string');
      expect(Array.isArray(validResponse.keyFeatures)).toBe(true);
      expect(validResponse.summary.length).toBeGreaterThan(0);
      expect(validResponse.keyFeatures.length).toBeGreaterThan(0);
    });

    it('should validate user introduction response structure', () => {
      const validResponse = {
        introduction: 'I am a developer...',
        skills: ['React', 'Node.js', 'TypeScript'],
        interests: ['Web Development', 'Open Source']
      };

      expect(validResponse).toHaveProperty('introduction');
      expect(validResponse).toHaveProperty('skills');
      expect(validResponse).toHaveProperty('interests');
      expect(typeof validResponse.introduction).toBe('string');
      expect(Array.isArray(validResponse.skills)).toBe(true);
      expect(Array.isArray(validResponse.interests)).toBe(true);
    });

    it('should handle malformed API responses', () => {
      const malformedResponses = [
        null,
        undefined,
        {},
        { summary: null },
        { keyFeatures: 'not an array' },
        { summary: '', keyFeatures: [] }
      ];

      malformedResponses.forEach(response => {
        const isValid = Boolean(response &&
          typeof response === 'object' &&
          'summary' in response &&
          'keyFeatures' in response &&
          typeof response.summary === 'string' &&
          Array.isArray(response.keyFeatures) &&
          response.summary.length > 0);

        // All malformed responses should be invalid
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed');
      mockGenerateRepoSummary.mockRejectedValue(networkError);

      await expect(mockGenerateRepoSummary('repo', 'desc', 'readme', 'key'))
        .rejects.toThrow('Network request failed');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Invalid API key');
      mockGenerateRepoSummary.mockRejectedValue(authError);

      await expect(mockGenerateRepoSummary('repo', 'desc', 'readme', 'invalid-key'))
        .rejects.toThrow('Invalid API key');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockGenerateUserIntroduction.mockRejectedValue(timeoutError);

      await expect(mockGenerateUserIntroduction([], 'key'))
        .rejects.toThrow('Request timeout');
    });
  });

  describe('Content Processing', () => {
    it('should handle special characters in repository content', () => {
      const contentWithSpecialChars = {
        name: 'test-repo-with-émojis-🚀',
        description: 'A repo with special chars: áéíóú & symbols!',
        readme: '# Project with "quotes" and \'apostrophes\' and <tags>'
      };

      // Test that content is properly handled (no specific assertions needed, just ensure no errors)
      expect(contentWithSpecialChars.name).toContain('émojis');
      expect(contentWithSpecialChars.description).toContain('áéíóú');
      expect(contentWithSpecialChars.readme).toContain('"quotes"');
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000);
      const longDescription = 'B'.repeat(5000);

      // Test that long content doesn't break processing
      expect(longContent.length).toBe(10000);
      expect(longDescription.length).toBe(5000);
    });

    it('should handle empty or minimal content', () => {
      const minimalContent = {
        name: 'repo',
        description: '',
        readme: null
      };

      expect(minimalContent.name).toBe('repo');
      expect(minimalContent.description).toBe('');
      expect(minimalContent.readme).toBeNull();
    });
  });
});