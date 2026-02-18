import { describe, it, expect } from 'vitest';
import { extractTitleFromReadme } from '../server/lib/gitlab.js';

describe('extractTitleFromReadme', () => {
  it('should return null for null or empty readme', () => {
    expect(extractTitleFromReadme(null)).toBeNull();
    expect(extractTitleFromReadme('')).toBeNull();
  });

  it('should extract standard H1 heading', () => {
    const readme = '# My Project\n\nSome description';
    expect(extractTitleFromReadme(readme)).toBe('My Project');
  });

  it('should extract H1 heading with multiple spaces', () => {
    const readme = '#   My Project   \n\nSome description';
    expect(extractTitleFromReadme(readme)).toBe('My Project');
  });

  it('should extract H1 heading even if it is not the first line', () => {
    const readme = '\n\n# My Project\n\nSome description';
    expect(extractTitleFromReadme(readme)).toBe('My Project');
  });

  it('should extract H1 heading with no space after #', () => {
    const readme = '#My Project\n\nSome description';
    expect(extractTitleFromReadme(readme)).toBe('My Project');
  });

  it('should extract H1 heading with leading whitespace', () => {
    const readme = '  # My Project\n\nSome description';
    expect(extractTitleFromReadme(readme)).toBe('My Project');
  });

  it('should ignore other levels of headings', () => {
    const readme = '## Section\n\n### Sub-section\n\n# Real Title';
    expect(extractTitleFromReadme(readme)).toBe('Real Title');
  });

  it('should handle Setext-style H1 headings', () => {
    const readme = 'My Setext Project\n=================\n\nDescription';
    expect(extractTitleFromReadme(readme)).toBe('My Setext Project');
  });

  it('should handle Setext-style headings not on first line', () => {
    const readme = 'Some intro text\n\nAnother Title\n=============\n\nDescription';
    expect(extractTitleFromReadme(readme)).toBe('Another Title');
  });

  it('should return null if no H1 heading is found', () => {
    const readme = 'Just some text\nwithout any H1 headers';
    expect(extractTitleFromReadme(readme)).toBeNull();
  });
});
