import { describe, it, expect } from 'vitest';
import { themes } from '../shared/themes.js';

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
function generatePortfolioHtml(
  username: string,
  repositories: typeof mockRepositories,
  introduction?: typeof mockIntroduction,
  avatarUrl?: string | null,
  theme: typeof themes[0] = themes[1] // Default to modern theme
): string {
  if (!repositories || repositories.length === 0) {
    throw new Error("No repositories provided for portfolio generation");
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(username)}'s Portfolio</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body class="${theme.preview.background}">
    <div class="container mx-auto px-4 py-20">
        <div class="${theme.layout.container}">
            <header class="${theme.layout.header}">
                <div class="${theme.layout.profile}">
                    ${avatarUrl ? `
                    <div class="mb-6">
                        <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(username)}" class="w-32 h-32 rounded-full mx-auto border-4 border-gray-200 shadow-lg">
                    </div>
                    ` : ''}
                    <h1 class="text-4xl font-bold mb-6 ${theme.preview.text}">${escapeHtml(username)}'s Portfolio</h1>
                    ${introduction ? `
                    <div class="max-w-2xl ${theme.id === 'modern' ? 'text-center' : 'text-left'}">
                        <p class="${theme.preview.text} mb-8 leading-relaxed">${escapeHtml(introduction.introduction)}</p>
                        <div class="flex flex-wrap gap-3 ${theme.id === 'modern' ? 'justify-center' : ''} mb-8">
                            ${introduction.skills.map(skill =>
                              `<span class="${theme.preview.accent} px-3 py-1 rounded-full text-sm font-medium">${escapeHtml(skill)}</span>`
                            ).join('')}
                        </div>
                        <p class="${theme.preview.text} text-sm mb-8">
                            <span class="font-medium">Interests:</span> ${introduction.interests.map(interest => escapeHtml(interest)).join(', ')}
                        </p>
                    </div>
                    ` : ''}
                </div>
            </header>

            <div class="${theme.layout.content}">
                ${repositories.map(repo => `
                    <article class="${theme.preview.card} p-6 relative">
                        <div class="flex justify-between items-start">
                            <h2 class="text-2xl font-semibold mb-2 ${theme.preview.text}">${escapeHtml(repo.displayName || repo.name)}</h2>
                            <div class="flex items-center gap-2">
                                ${repo.metadata?.stars > 0 ? `
                                <span class="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full flex items-center">
                                    ★ ${repo.metadata.stars}
                                </span>
                                ` : ''}
                                <a href="${repo.url}" class="icon-button border border-gray-200 bg-white" target="_blank" title="View on GitHub">
                                    <i class="fab fa-github"></i>
                                </a>
                                ${repo.metadata?.url ?
                                    `<a href="${repo.metadata.url}" class="icon-button border border-gray-200 bg-white" target="_blank" title="View Live Demo">
                                        <i class="fas fa-external-link-alt"></i>
                                    </a>`
                                    : ''}
                            </div>
                        </div>
                        <p class="${theme.preview.text} mb-4">${escapeHtml(repo.summary || repo.description || '')}</p>
                        <div class="flex gap-2 flex-wrap">
                            ${(repo.metadata?.topics || []).map(topic =>
                                `<span class="${theme.preview.accent} px-2 py-1 rounded-full text-sm">${escapeHtml(topic)}</span>`
                            ).join('')}
                        </div>
                    </article>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>`;
}

describe('Portfolio Generation', () => {
  describe('HTML Generation', () => {
    it('should generate valid HTML with repositories', () => {
      const html = generatePortfolioHtml('testuser', mockRepositories);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain("testuser's Portfolio");
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
      expect(html).toContain('alt="testuser"');
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
  });
});