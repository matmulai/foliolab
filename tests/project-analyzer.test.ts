import { describe, it, expect } from 'vitest';
import { generateProjectSummary, ProjectStructure } from '../server/lib/project-analyzer';

// Helper to create a minimal valid ProjectStructure
const createStructure = (overrides: Partial<ProjectStructure> = {}): ProjectStructure => ({
  rootFiles: [],
  directories: [],
  packageFiles: [],
  configFiles: [],
  sourceFiles: [],
  frameworkIndicators: [],
  projectType: 'Unknown',
  techStack: [],
  ...overrides
});

describe('Project Analyzer - generateProjectSummary', () => {
  it('should generate a basic summary for a known project type', () => {
    const structure = createStructure({
      projectType: 'React',
      techStack: ['React', 'TypeScript']
    });

    const summary = generateProjectSummary(structure);
    expect(summary).toBe('This is a React project. built with React, TypeScript.');
  });

  it('should handle Unknown project type correctly', () => {
    const structure = createStructure({
      projectType: 'Unknown',
      techStack: ['JavaScript']
    });

    const summary = generateProjectSummary(structure);
    // Should skip "This is a Unknown project" part
    expect(summary).toBe('built with JavaScript.');
  });

  it('should handle empty tech stack', () => {
    const structure = createStructure({
      projectType: 'Python'
    });

    const summary = generateProjectSummary(structure);
    expect(summary).toBe('This is a Python project.');
  });

  it('should limit tech stack display to 5 items', () => {
    const structure = createStructure({
      projectType: 'Node.js',
      techStack: ['Express', 'TypeScript', 'Jest', 'PostgreSQL', 'Redis', 'Docker', 'AWS']
    });

    const summary = generateProjectSummary(structure);
    expect(summary).toContain('built with Express, TypeScript, Jest, PostgreSQL, Redis');
    expect(summary).not.toContain('Docker');
    expect(summary).not.toContain('AWS');
  });

  it('should detect backend API features', () => {
    const structure = createStructure({
      projectType: 'Express',
      directories: ['api']
    });

    const summary = generateProjectSummary(structure);
    expect(summary).toContain('featuring backend API');
  });

  it('should detect frontend interface features', () => {
    const structure = createStructure({
      projectType: 'React',
      directories: ['client']
    });

    const summary = generateProjectSummary(structure);
    expect(summary).toContain('featuring frontend interface');
  });

  it('should detect mobile application features (directory based)', () => {
    const structure = createStructure({
      projectType: 'React Native',
      directories: ['mobile']
    });

    const summary = generateProjectSummary(structure);
    expect(summary).toContain('featuring mobile application');
  });

  it('should detect mobile application features (framework based)', () => {
    const structure = createStructure({
      projectType: 'React Native',
      frameworkIndicators: [{ framework: 'React Native Mobile', confidence: 100, indicators: [] }]
    });

    const summary = generateProjectSummary(structure);
    expect(summary).toContain('featuring mobile application');
  });

  it('should detect documentation features', () => {
    const structure = createStructure({
      projectType: 'Library',
      directories: ['docs']
    });

    const summary = generateProjectSummary(structure);
    expect(summary).toContain('featuring comprehensive documentation');
  });

  it('should detect test suite features', () => {
    const structure = createStructure({
      projectType: 'Library',
      directories: ['tests']
    });

    const summary = generateProjectSummary(structure);
    expect(summary).toContain('featuring test suite');
  });

  it('should combine multiple features', () => {
    const structure = createStructure({
      projectType: 'Fullstack',
      directories: ['api', 'client', 'docs', 'tests']
    });

    const summary = generateProjectSummary(structure);
    expect(summary).toContain('featuring backend API, frontend interface, comprehensive documentation, test suite');
  });

  it('should include package description if available', () => {
    const structure = createStructure({
      projectType: 'Node.js',
      packageFiles: [{
        name: 'package.json',
        type: 'package.json',
        description: 'A test project description'
      }]
    });

    const summary = generateProjectSummary(structure);
    expect(summary).toContain('Description: A test project description');
  });

  it('should handle minimal structure (no type, no stack, no features, no description)', () => {
    const structure = createStructure();

    const summary = generateProjectSummary(structure);
    // Should result in just a dot if nothing is generated, or handle gracefully.
    // Based on code: parts joined by '. ' + '.'
    // If parts is empty, it returns '.'
    expect(summary).toBe('.');
  });

  it('should generate a comprehensive summary with all elements', () => {
    const structure = createStructure({
      projectType: 'MERN Stack',
      techStack: ['MongoDB', 'Express', 'React', 'Node.js'],
      directories: ['server', 'client', 'docs'],
      packageFiles: [{
        name: 'package.json',
        type: 'package.json',
        description: 'The ultimate MERN boilerplate'
      }]
    });

    const summary = generateProjectSummary(structure);

    expect(summary).toContain('This is a MERN Stack project');
    expect(summary).toContain('built with MongoDB, Express, React, Node.js');
    expect(summary).toContain('featuring backend API, frontend interface, comprehensive documentation');
    expect(summary).toContain('Description: The ultimate MERN boilerplate');
  });
});
