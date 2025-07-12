import { describe, it, expect } from 'vitest';
import { generateProjectSummary } from '../server/lib/project-analyzer.js';

describe('No README Handling', () => {
  it('should generate project summary from structure analysis', () => {
    // Test generateProjectSummary with mock structure
    const mockProjectStructure = {
      rootFiles: ['package.json', 'server.js', '.env.example'],
      directories: ['routes', 'middleware', 'models', 'controllers'],
      packageFiles: [{
        name: 'package.json',
        type: 'package.json' as const,
        dependencies: ['express', 'cors', 'helmet', 'dotenv', 'mongoose'],
        scripts: ['start', 'dev', 'test'],
        description: 'RESTful API server with Express.js'
      }],
      configFiles: [{
        name: '.eslintrc.js',
        type: 'linting' as const,
        framework: 'ESLint'
      }],
      sourceFiles: [{
        name: 'server.js',
        extension: '.js',
        language: 'JavaScript',
        isEntryPoint: true,
        size: 2048
      }],
      frameworkIndicators: [{
        framework: 'Express.js',
        confidence: 85,
        indicators: ['Uses express', 'Has server.js']
      }],
      projectType: 'Express.js',
      techStack: ['Express.js', 'JavaScript', 'Node.js']
    };

    const structureSummary = generateProjectSummary(mockProjectStructure);
    
    expect(structureSummary).toBeDefined();
    expect(typeof structureSummary).toBe('string');
    expect(structureSummary.length).toBeGreaterThan(0);
    
    // Should contain key information about the project
    expect(structureSummary).toContain('Express.js');
    expect(structureSummary).toContain('JavaScript');
  });

  it('should handle minimal project structure', () => {
    const minimalStructure = {
      rootFiles: ['index.js'],
      directories: [],
      packageFiles: [],
      configFiles: [],
      sourceFiles: [{
        name: 'index.js',
        extension: '.js',
        language: 'JavaScript',
        isEntryPoint: true,
        size: 512
      }],
      frameworkIndicators: [],
      projectType: 'JavaScript',
      techStack: ['JavaScript', 'Node.js']
    };

    const summary = generateProjectSummary(minimalStructure);
    
    expect(summary).toBeDefined();
    expect(typeof summary).toBe('string');
    expect(summary).toContain('JavaScript');
  });

  it('should handle project with multiple frameworks', () => {
    const multiFrameworkStructure = {
      rootFiles: ['package.json', 'next.config.js', 'tailwind.config.js'],
      directories: ['pages', 'components', 'styles'],
      packageFiles: [{
        name: 'package.json',
        type: 'package.json' as const,
        dependencies: ['next', 'react', 'tailwindcss'],
        scripts: ['dev', 'build', 'start'],
        description: 'Next.js app with Tailwind CSS'
      }],
      configFiles: [
        {
          name: 'next.config.js',
          type: 'build' as const,
          framework: 'Next.js'
        },
        {
          name: 'tailwind.config.js',
          type: 'config' as const,
          framework: 'Tailwind CSS'
        }
      ],
      sourceFiles: [{
        name: 'pages/index.js',
        extension: '.js',
        language: 'JavaScript',
        isEntryPoint: true,
        size: 1024
      }],
      frameworkIndicators: [
        {
          framework: 'Next.js',
          confidence: 95,
          indicators: ['Has next.config.js', 'Uses next']
        },
        {
          framework: 'Tailwind CSS',
          confidence: 90,
          indicators: ['Has tailwind.config.js', 'Uses tailwindcss']
        }
      ],
      projectType: 'Next.js',
      techStack: ['Next.js', 'React', 'Tailwind CSS', 'JavaScript']
    };

    const summary = generateProjectSummary(multiFrameworkStructure);
    
    expect(summary).toBeDefined();
    expect(summary).toContain('Next.js');
    expect(summary).toContain('Tailwind CSS');
    expect(summary).toContain('React');
  });
});