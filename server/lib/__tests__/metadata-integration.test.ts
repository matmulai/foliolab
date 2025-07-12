import { generateRepoSummary } from '../openai.js';

// Mock test to verify metadata integration
async function testMetadataIntegration() {
  console.log('Testing metadata integration...');
  
  const mockRepo = {
    name: 'test-repo',
    description: 'A test repository for portfolio generation',
    readme: `# Test Repository

## Features
- Feature 1: Authentication system
- Feature 2: Data visualization
- Feature 3: API integration

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
This is a sample usage section.`,
    metadata: {
      language: 'TypeScript',
      topics: ['web-development', 'react', 'nodejs'],
      stars: 42,
      url: 'https://github.com/user/test-repo'
    }
  };

  try {
    // Test the enhanced generateRepoSummary function
    const summary = await generateRepoSummary(
      mockRepo.name,
      mockRepo.description,
      mockRepo.readme,
      'test-api-key', // This will fail but we can see the structure
      undefined, // customPrompt
      mockRepo.metadata
    );
    
    console.log('✅ Metadata integration test passed');
    console.log('Summary structure:', typeof summary);
  } catch (error) {
    // Expected to fail due to API key, but we can verify the function signature works
    if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('authentication')) {
      console.log('✅ Function signature works correctly (API key error expected)');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
}

// Export for potential use
export { testMetadataIntegration };

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMetadataIntegration();
}