import { describe, it, expect } from 'vitest';
import { themes } from '../shared/themes.js';
import { generatePortfolioHtml } from '../server/routes/deploy.js';

// Mock repository data for testing
const mockRepositories = [
  {
    id: 1,
    name: 'awesome-project',
    displayName: 'Awesome Project',
    description: 'A really awesome project that does amazing things',
    url: 'https://github.com/testuser/awesome-project',
    summary: 'This project demonstrates modern web development practices with React and TypeScript.',
    selected: true,
    source: 'github' as const,
    owner: {
      login: 'testuser',
      type: 'User' as const,
      avatarUrl: 'https://github.com/testuser.png',
    },
    metadata: {
      id: 1,
      stars: 42,
      language: 'TypeScript',
      topics: ['react', 'typescript', 'web'],
      updatedAt: '2024-01-01T00:00:00Z',
      url: 'https://awesome-project.com',
    },
  },
  {
    id: 2,
    name: 'api-server',
    displayName: 'REST API Server',
    description: 'A robust REST API server built with Express.js',
    url: 'https://github.com/testuser/api-server',
    summary: 'A scalable REST API server with authentication, rate limiting, and comprehensive documentation.',
    selected: true,
    source: 'github' as const,
    owner: {
      login: 'testuser',
      type: 'User' as const,
      avatarUrl: 'https://github.com/testuser.png',
    },
    metadata: {
      id: 2,
      stars: 15,
      language: 'JavaScript',
      topics: ['nodejs', 'express', 'api'],
      updatedAt: '2024-01-15T00:00:00Z',
      url: null,
    },
  },
];

const mockIntroduction = {
  introduction: 'I am a passionate full-stack developer with expertise in modern web technologies.',
  skills: ['React', 'TypeScript', 'Node.js', 'Express.js', 'MongoDB'],
  interests: ['Open Source', 'Web Performance', 'Developer Tools'],
};

// Helper function to escape HTML to prevent XSS attacks
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper function to generate portfolio HTML (extracted from routes.ts)
// Now imported directly from source

describe('Portfolio Generation', () => {
  describe('HTML Generation', () => {
    it('should generate valid HTML with repositories', () => {
      const html = generatePortfolioHtml('testuser', mockRepositories);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain("Testuser&#039;s Portfolio");
      expect(html).toContain('Awesome Project');
      expect(html).toContain('REST API Server');
    });

    it('should include user introduction when provided', () => {
      const html = generatePortfolioHtml('testuser', mockRepositories, mockIntroduction);
      
      expect(html).toContain(mockIntroduction.introduction);
      expect(html).toContain('React');
      expect(html).toContain('TypeScript');
      expect(html).toContain('Open Source');
    });

    it('should include avatar when provided', () => {
      const avatarUrl = 'https://github.com/testuser.png';
      const html = generatePortfolioHtml('testuser', mockRepositories, undefined, avatarUrl);
      
      expect(html).toContain(`<img src="${avatarUrl}"`);
      expect(html).toContain('alt="Testuser"');
    });

    it('should throw error when no repositories provided', () => {
      expect(() => {
        generatePortfolioHtml('testuser', []);
      }).toThrow('No repositories provided for portfolio generation');
    });

    it('should handle repositories without metadata gracefully', () => {
      const repoWithoutMetadata = [{
        ...mockRepositories[0],
        metadata: undefined,
      }];
      
      const html = generatePortfolioHtml('testuser', repoWithoutMetadata as any);
      expect(html).toContain('Awesome Project');
      expect(html).not.toContain('★'); // No stars shown
    });

    it('should display repository stars when available', () => {
      const html = generatePortfolioHtml('testuser', mockRepositories);
      
      expect(html).toContain('★ 42'); // First repo stars
      expect(html).toContain('★ 15'); // Second repo stars
    });

    it('should include live demo links when available', () => {
      const html = generatePortfolioHtml('testuser', mockRepositories);
      
      expect(html).toContain('https://awesome-project.com');
      expect(html).toContain('View Live Demo');
    });

    it('should include GitHub links for all repositories', () => {
      const html = generatePortfolioHtml('testuser', mockRepositories);
      
      expect(html).toContain('https://github.com/testuser/awesome-project');
      expect(html).toContain('https://github.com/testuser/api-server');
      expect(html).toContain('View on GitHub');
    });

    it('should display repository topics as tags', () => {
      const html = generatePortfolioHtml('testuser', mockRepositories);
      
      expect(html).toContain('react');
      expect(html).toContain('typescript');
      expect(html).toContain('nodejs');
      expect(html).toContain('express');
    });
  });

  describe('Theme Integration', () => {
    it('should apply minimal theme correctly', () => {
      const minimalTheme = themes.find(t => t.id === 'minimal')!;
      const html = generatePortfolioHtml('testuser', mockRepositories, undefined, undefined, minimalTheme);
      
      expect(html).toContain(minimalTheme.preview.background);
      expect(html).toContain(minimalTheme.layout.container);
      expect(html).toContain(minimalTheme.preview.text);
    });

    it('should apply modern theme correctly', () => {
      const modernTheme = themes.find(t => t.id === 'modern')!;
      const html = generatePortfolioHtml('testuser', mockRepositories, mockIntroduction, undefined, modernTheme);
      
      expect(html).toContain(modernTheme.preview.background);
      expect(html).toContain(modernTheme.layout.container);
      expect(html).toContain('text-center'); // Modern theme centers content when introduction is provided
    });

    it('should apply elegant theme correctly', () => {
      const elegantTheme = themes.find(t => t.id === 'elegant')!;
      const html = generatePortfolioHtml('testuser', mockRepositories, undefined, undefined, elegantTheme);
      
      expect(html).toContain(elegantTheme.preview.background);
      expect(html).toContain(elegantTheme.layout.container);
      expect(html).toContain(elegantTheme.preview.card);
    });

    it('should default to modern theme when no theme provided', () => {
      const html = generatePortfolioHtml('testuser', mockRepositories);
      const modernTheme = themes[1]; // Modern theme is at index 1
      
      expect(html).toContain(modernTheme.preview.background);
    });
  });

  describe('Content Validation', () => {
    it('should escape HTML in user content', () => {
      const repoWithHtml = [{
        ...mockRepositories[0],
        description: 'A project with <script>alert("xss")</script> content',
        summary: 'Summary with <img src="x" onerror="alert(1)"> content',
      }];
      
      const html = generatePortfolioHtml('testuser', repoWithHtml);
      
      // The HTML should escape malicious content to prevent XSS vulnerabilities
      // The summary is used in the template, not the description
      expect(html).toContain('&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;'); // Escaped HTML is included from summary
      expect(html).not.toContain('<script>alert("xss")</script>'); // Script is in description, not shown
      // Ensure all user-generated content is properly escaped
    });

    it('should handle missing displayName gracefully', () => {
      const repoWithoutDisplayName = [{
        ...mockRepositories[0],
        displayName: undefined,
      }];
      
      const html = generatePortfolioHtml('testuser', repoWithoutDisplayName as any);
      expect(html).toContain(mockRepositories[0].name); // Falls back to name
    });

    it('should handle missing description and summary', () => {
      const repoWithoutDescription = [{
        ...mockRepositories[0],
        description: null,
        summary: null,
      }];
      
      const html = generatePortfolioHtml('testuser', repoWithoutDescription as any);
      expect(html).toContain(mockRepositories[0].name);
      // Should not crash, even with missing content
    });

    it('should prevent XSS in repository URLs', () => {
      const repoWithXss = [{
        ...mockRepositories[0],
        url: 'javascript:alert("xss")',
        metadata: {
          ...mockRepositories[0].metadata,
          url: 'javascript:alert("xss")',
        },
      }];

      const html = generatePortfolioHtml('testuser', repoWithXss as any);

      // Should not contain the malicious URL in href
      expect(html).not.toContain('href="javascript:alert(&quot;xss&quot;)"');
      expect(html).not.toContain('href="javascript:alert(\'xss\')"');
      expect(html).not.toContain('href="javascript:alert("xss")"');

      // Should handle it by omitting or cleaning
      // Our implementation omits the link if invalid
      expect(html).not.toContain('class="icon-button border border-gray-200 bg-white"');
    });
  });
});