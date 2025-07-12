import { cleanReadmeContent } from './readme-cleaner.js';

// Example README with various sections including boilerplate
const comprehensiveReadme = `# Advanced Web Scraper

[![PyPI](https://img.shields.io/pypi/v/web-scraper.svg)](https://pypi.org/project/web-scraper/)
[![Tests](https://github.com/user/web-scraper/workflows/Test/badge.svg)](https://github.com/user/web-scraper/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/user/web-scraper/blob/main/LICENSE)

A powerful, async web scraping framework built with Python that handles JavaScript-heavy sites, rate limiting, and data extraction with ease.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)
- [Code of Conduct](#code-of-conduct)

## Features

- **Async Processing**: Handle thousands of URLs concurrently
- **JavaScript Support**: Full browser automation with Playwright
- **Smart Rate Limiting**: Automatic throttling and retry mechanisms
- **Data Pipeline**: Built-in data cleaning and export capabilities
- **Proxy Support**: Rotate through proxy servers automatically

## Installation

\`\`\`bash
pip install advanced-web-scraper
\`\`\`

## Quick Start

\`\`\`python
from web_scraper import AsyncScraper

scraper = AsyncScraper()
data = await scraper.scrape_urls([
    'https://example.com/page1',
    'https://example.com/page2'
])
\`\`\`

## API Documentation

### AsyncScraper Class

The main scraper class provides the following methods:

- \`scrape_urls(urls: List[str])\` - Scrape multiple URLs
- \`configure_browser(options: dict)\` - Set browser options
- \`set_rate_limit(requests_per_second: int)\` - Configure rate limiting

## Architecture

The scraper uses a multi-layered architecture:

1. **Request Layer**: Handles HTTP requests and browser automation
2. **Processing Layer**: Extracts and cleans data
3. **Storage Layer**: Exports data in various formats

## Configuration

Create a \`config.yaml\` file:

\`\`\`yaml
rate_limit: 10
browser:
  headless: true
  timeout: 30000
\`\`\`

## Troubleshooting

### Common Issues

**Issue**: Browser crashes frequently
**Solution**: Increase memory allocation or reduce concurrency

**Issue**: Rate limiting errors
**Solution**: Decrease requests per second in configuration

### Known Limitations

- Some sites may block automated requests
- JavaScript-heavy sites require more resources

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

Please read our [Contributing Guidelines](CONTRIBUTING.md) for detailed information about our development process, coding standards, and how to submit pull requests.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to project maintainers.

We are committed to providing a welcoming and inspiring community for all. Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism

## Security

If you discover a security vulnerability, please send an email to security@example.com. All security vulnerabilities will be promptly addressed.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v2.1.0 (2024-01-15)
- Added proxy rotation support
- Improved error handling
- Fixed memory leaks in browser automation

### v2.0.0 (2023-12-01)
- Complete rewrite with async support
- Breaking changes to API
- Added JavaScript rendering

### v1.5.0 (2023-10-15)
- Added rate limiting
- Improved data export options

## Acknowledgments

- Thanks to the Playwright team for browser automation
- Inspired by Scrapy framework
- Special thanks to all contributors

## FAQ

**Q: Can this scrape sites that require login?**
A: Yes, you can configure authentication in the browser options.

**Q: What's the maximum number of concurrent requests?**
A: This depends on your system resources, but we recommend starting with 50-100.

**Q: Does it work with single-page applications?**
A: Yes, the JavaScript rendering handles SPAs automatically.

## Support

If you need help:

1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information
4. Join our Discord community
`;

/**
 * Demonstrates the enhanced README content extraction
 */
export function demonstrateEnhancedCleaning() {
  console.log('=== ORIGINAL README (with boilerplate sections) ===');
  console.log(`Length: ${comprehensiveReadme.length} characters`);
  console.log(comprehensiveReadme);
  
  console.log('\n=== CLEANED README (focused on project essence) ===');
  const cleaned = cleanReadmeContent(comprehensiveReadme);
  console.log(`Length: ${cleaned.length} characters`);
  console.log(cleaned);
  
  console.log('\n=== COMPARISON ===');
  console.log(`Original length: ${comprehensiveReadme.length} characters`);
  console.log(`Cleaned length: ${cleaned.length} characters`);
  console.log(`Removed: ${comprehensiveReadme.length - cleaned.length} characters`);
  console.log(`Reduction: ${Math.round((1 - cleaned.length / comprehensiveReadme.length) * 100)}%`);
  
  // Analyze what sections were preserved
  const sections = cleaned.split(/\n(?=#+\s)/).map(section => {
    const header = section.split('\n')[0];
    return header.replace(/^#+\s*/, '');
  }).filter(Boolean);
  
  console.log('\n=== PRESERVED SECTIONS ===');
  sections.forEach(section => console.log(`- ${section}`));
  
  return cleaned;
}

// Uncomment to run the demonstration
// demonstrateEnhancedCleaning();