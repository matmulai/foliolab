import { describe, it, expect } from 'vitest';
import { cleanReadmeContent } from '../server/lib/readme-cleaner.js';

describe('README Cleaner', () => {
  it('should remove badges from README content', () => {
    const readmeWithBadges = `# My Project

[![Build Status](https://travis-ci.org/user/repo.svg?branch=master)](https://travis-ci.org/user/repo)
[![npm version](https://badge.fury.io/js/package.svg)](https://badge.fury.io/js/package)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

This is a great project that does amazing things.

## Installation

\`\`\`bash
npm install my-project
\`\`\`

## Usage

Here's how to use it...`;

    const cleaned = cleanReadmeContent(readmeWithBadges);
    
    // Should remove badges but keep content
    expect(cleaned).not.toContain('[![Build Status]');
    expect(cleaned).not.toContain('[![npm version]');
    expect(cleaned).not.toContain('![License]');
    expect(cleaned).toContain('This is a great project');
    expect(cleaned).toContain('## Installation');
    expect(cleaned).toContain('## Usage');
  });

  it('should remove boilerplate sections', () => {
    const readmeWithBoilerplate = `# My Project

This is a great project.

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

* Hat tip to anyone whose code was used
* Inspiration
* etc`;

    const cleaned = cleanReadmeContent(readmeWithBoilerplate);
    
    // Should remove boilerplate sections
    expect(cleaned).not.toContain('## Contributing');
    expect(cleaned).not.toContain('## License');
    expect(cleaned).not.toContain('## Acknowledgments');
    expect(cleaned).toContain('This is a great project');
  });

  it('should preserve essential content', () => {
    const readmeWithEssentials = `# My Project

This project does amazing things.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
npm install
\`\`\`

## API Reference

### \`myFunction()\`

Does something important.

## Examples

Here are some examples...`;

    const cleaned = cleanReadmeContent(readmeWithEssentials);
    
    // Should preserve essential sections
    expect(cleaned).toContain('## Features');
    expect(cleaned).toContain('## Installation');
    expect(cleaned).toContain('## API Reference');
    expect(cleaned).toContain('## Examples');
    expect(cleaned).toContain('This project does amazing things');
  });

  it('should handle empty or minimal README', () => {
    const minimalReadme = `# My Project

A simple project.`;

    const cleaned = cleanReadmeContent(minimalReadme);
    
    expect(cleaned).toContain('# My Project');
    expect(cleaned).toContain('A simple project');
  });

  it('should remove table of contents', () => {
    const readmeWithToc = `# My Project

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)

## Installation

Install the package...

## Usage

Use it like this...`;

    const cleaned = cleanReadmeContent(readmeWithToc);
    
    expect(cleaned).not.toContain('## Table of Contents');
    expect(cleaned).not.toContain('- [Installation](#installation)');
    expect(cleaned).toContain('## Installation');
    expect(cleaned).toContain('## Usage');
  });
});