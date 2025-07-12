/**
 * Utility functions for cleaning README content before LLM processing
 */

/**
 * Removes common badges and shields from README content
 * @param readme - Raw README content
 * @returns Cleaned README content with badges removed
 */
export function removeBadges(readme: string): string {
  if (!readme) return readme;

  // Common badge patterns to remove
  const badgePatterns = [
    // Shield.io badges - [![text](shield-url)](link-url)
    /\[\!\[([^\]]*)\]\([^)]*shields\.io[^)]*\)\]\([^)]*\)/g,
    
    // PyPI badges
    /\[\!\[PyPI[^\]]*\]\([^)]*pypi\.org[^)]*\)\]\([^)]*\)/g,
    
    // GitHub workflow/action badges
    /\[\!\[([^\]]*)\]\([^)]*github\.com[^)]*workflows[^)]*\)\]\([^)]*\)/g,
    /\[\!\[([^\]]*)\]\([^)]*github\.com[^)]*actions[^)]*\)\]\([^)]*\)/g,
    
    // License badges
    /\[\!\[License[^\]]*\]\([^)]*badge[^)]*license[^)]*\)\]\([^)]*\)/g,
    /\[\!\[([^\]]*license[^\]]*)\]\([^)]*\)\]\([^)]*\)/gi,
    
    // Version/Release badges
    /\[\!\[([^\]]*version[^\]]*)\]\([^)]*\)\]\([^)]*\)/gi,
    /\[\!\[([^\]]*release[^\]]*)\]\([^)]*\)\]\([^)]*\)/gi,
    /\[\!\[Changelog[^\]]*\]\([^)]*\)\]\([^)]*\)/g,
    
    // Test/CI badges
    /\[\!\[([^\]]*test[^\]]*)\]\([^)]*\)\]\([^)]*\)/gi,
    /\[\!\[([^\]]*build[^\]]*)\]\([^)]*\)\]\([^)]*\)/gi,
    /\[\!\[([^\]]*ci[^\]]*)\]\([^)]*\)\]\([^)]*\)/gi,
    
    // Coverage badges
    /\[\!\[([^\]]*coverage[^\]]*)\]\([^)]*\)\]\([^)]*\)/gi,
    /\[\!\[([^\]]*codecov[^\]]*)\]\([^)]*\)\]\([^)]*\)/gi,
    
    // Documentation badges
    /\[\!\[([^\]]*docs[^\]]*)\]\([^)]*\)\]\([^)]*\)/gi,
    /\[\!\[([^\]]*documentation[^\]]*)\]\([^)]*\)\]\([^)]*\)/gi,
    
    // Download/Install badges
    /\[\!\[([^\]]*download[^\]]*)\]\([^)]*\)\]\([^)]*\)/gi,
    /\[\!\[([^\]]*install[^\]]*)\]\([^)]*\)\]\([^)]*\)/gi,
    
    // Generic img.shields.io badges
    /\[\!\[([^\]]*)\]\([^)]*img\.shields\.io[^)]*\)\]\([^)]*\)/g,
    
    // Standalone shield images without links
    /\!\[([^\]]*)\]\([^)]*shields\.io[^)]*\)/g,
    /\!\[([^\]]*)\]\([^)]*img\.shields\.io[^)]*\)/g,
    
    // Common badge hosting services
    /\[\!\[([^\]]*)\]\([^)]*badge\.fury\.io[^)]*\)\]\([^)]*\)/g,
    /\[\!\[([^\]]*)\]\([^)]*badgen\.net[^)]*\)\]\([^)]*\)/g,
    /\[\!\[([^\]]*)\]\([^)]*flat\.badgen\.net[^)]*\)\]\([^)]*\)/g,
  ];

  let cleanedReadme = readme;

  // Apply all badge removal patterns
  badgePatterns.forEach(pattern => {
    cleanedReadme = cleanedReadme.replace(pattern, '');
  });

  // Remove multiple consecutive newlines left by badge removal
  cleanedReadme = cleanedReadme.replace(/\n{3,}/g, '\n\n');

  // Remove leading/trailing whitespace
  cleanedReadme = cleanedReadme.trim();

  return cleanedReadme;
}

/**
 * Additional cleanup for common README noise
 * @param readme - README content
 * @returns Further cleaned README content
 */
/**
 * Extracts the most relevant content from README for portfolio generation
 * Removes badges, boilerplate sections, and focuses on project essence
 * @param readme - README content
 * @returns Cleaned and focused README content
 */
export function cleanReadmeContent(readme: string): string {
  if (!readme) return readme;

  let cleaned = removeBadges(readme);
  cleaned = removeBoilerplateSections(cleaned);
  cleaned = extractRelevantSections(cleaned);
  cleaned = cleanupWhitespace(cleaned);

  return cleaned;
}

/**
 * Removes common boilerplate sections that don't add project context
 */
function removeBoilerplateSections(content: string): string {
  const sectionsToRemove = [
    // License sections
    /^#+\s*(License|Licensing)\s*\n[\s\S]*?(?=\n#+|\n\n---|\n\n===|$)/gmi,
    
    // Code of Conduct sections
    /^#+\s*(Code of Conduct|Contributor Code of Conduct|Contributing Guidelines)\s*\n[\s\S]*?(?=\n#+|\n\n---|\n\n===|$)/gmi,
    
    // Security sections (often boilerplate)
    /^#+\s*(Security|Security Policy|Reporting Security Issues)\s*\n[\s\S]*?(?=\n#+|\n\n---|\n\n===|$)/gmi,
    
    // Changelog sections (version history not relevant for portfolio)
    /^#+\s*(Changelog|Change Log|Release Notes|Version History)\s*\n[\s\S]*?(?=\n#+|\n\n---|\n\n===|$)/gmi,
    
    // Support/Help sections
    /^#+\s*(Support|Getting Help|Help|Community)\s*\n[\s\S]*?(?=\n#+|\n\n---|\n\n===|$)/gmi,
    
    // Acknowledgments/Credits (unless very brief)
    /^#+\s*(Acknowledgments?|Credits?|Thanks?)\s*\n[\s\S]*?(?=\n#+|\n\n---|\n\n===|$)/gmi,
    
    // Detailed contributing sections
    /^#+\s*(Contributing|How to Contribute|Contribution Guidelines)\s*\n[\s\S]*?(?=\n#+|\n\n---|\n\n===|$)/gmi,
    
    // FAQ sections (often too detailed for portfolio)
    /^#+\s*(FAQ|Frequently Asked Questions)\s*\n[\s\S]*?(?=\n#+|\n\n---|\n\n===|$)/gmi,
    
    // Detailed troubleshooting sections
    /^#+\s*(Troubleshooting|Common Issues|Known Issues)\s*\n[\s\S]*?(?=\n#+|\n\n---|\n\n===|$)/gmi,
    
    // Table of contents (not needed for LLM)
    /^#+\s*(Table of Contents?|Contents?|TOC)\s*\n[\s\S]*?(?=\n#+|\n\n---|\n\n===|$)/gmi,
  ];

  let cleaned = content;
  sectionsToRemove.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  return cleaned;
}

/**
 * Extracts and prioritizes the most relevant sections for project understanding
 */
function extractRelevantSections(content: string): string {
  // Split content into sections
  const sections = content.split(/\n(?=#+\s)/);
  const relevantSections: string[] = [];
  
  // Always include the title/header section (first section)
  if (sections[0]) {
    relevantSections.push(sections[0]);
  }

  // Priority sections that provide project context
  const prioritySections = [
    /^#+\s*(Description|About|Overview|What is|Introduction|Summary)/i,
    /^#+\s*(Features|Key Features|Highlights|What it does)/i,
    /^#+\s*(Quick Start|Getting Started|Quickstart)/i,
    /^#+\s*(Installation|Setup|Install)/i,
    /^#+\s*(Usage|How to use|Examples?|Demo)/i,
    /^#+\s*(API|Documentation|Docs)/i,
    /^#+\s*(Architecture|Design|How it works)/i,
    /^#+\s*(Requirements|Prerequisites|Dependencies)/i,
    /^#+\s*(Configuration|Config|Settings)/i,
  ];

  // Add sections that match priority patterns
  sections.slice(1).forEach(section => {
    const sectionHeader = section.split('\n')[0];
    const isPriority = prioritySections.some(pattern => pattern.test(sectionHeader));
    
    if (isPriority) {
      // Limit section length to avoid overly detailed content
      const limitedSection = limitSectionLength(section, 500);
      relevantSections.push(limitedSection);
    }
  });

  // If we don't have enough content, add other sections but with stricter limits
  if (relevantSections.join('\n\n').length < 800) {
    sections.slice(1).forEach(section => {
      const sectionHeader = section.split('\n')[0];
      const isAlreadyIncluded = relevantSections.some(existing =>
        existing.includes(sectionHeader)
      );
      
      if (!isAlreadyIncluded) {
        // Add with very strict length limit
        const limitedSection = limitSectionLength(section, 200);
        if (limitedSection.length > 50) { // Only add if it has meaningful content
          relevantSections.push(limitedSection);
        }
      }
    });
  }

  return relevantSections.join('\n\n');
}

/**
 * Limits the length of a section while preserving structure
 */
function limitSectionLength(section: string, maxLength: number): string {
  if (section.length <= maxLength) return section;
  
  const lines = section.split('\n');
  const header = lines[0];
  let content = '';
  let currentLength = header.length;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (currentLength + line.length + 1 > maxLength) {
      // Try to end at a natural break point
      if (content.includes('.') || content.includes('!') || content.includes('?')) {
        break;
      }
      // Otherwise, add this line if it's not too long
      if (currentLength + line.length + 1 < maxLength + 100) {
        content += '\n' + line;
      }
      break;
    }
    content += '\n' + line;
    currentLength += line.length + 1;
  }
  
  return header + content;
}

/**
 * Final cleanup of whitespace and formatting
 */
function cleanupWhitespace(content: string): string {
  let cleaned = content;
  
  // Remove common noise patterns
  const noisePatterns = [
    // Remove standalone horizontal rules
    /^---+$/gm,
    /^===+$/gm,
    
    // Remove empty badge sections
    /^\s*\[!\[.*?\]\(.*?\)\]\(.*?\)\s*$/gm,
    
    // Remove excessive code block markers without content
    /```\s*\n\s*```/g,
    
    // Remove table of contents links
    /^\s*[-*]\s*\[.*?\]\(#.*?\)\s*$/gm,
  ];

  noisePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Final cleanup of excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}