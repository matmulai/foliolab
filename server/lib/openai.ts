import OpenAI from "openai";
import { cleanReadmeContent } from "./readme-cleaner.js";
import { analyzeProjectStructure, generateProjectSummary, type ProjectStructure } from "./project-analyzer.js";

interface RepoSummary {
  summary: string;
}

interface UserIntroduction {
  introduction: string;
  skills: string[];
  interests: string[];
}

/**
 * LLM Configuration Constants
 * Centralized configuration for AI model parameters
 */
const LLM_CONFIG = {
  TEMPERATURE: 0.7, // Balance between creativity and consistency
  MAX_TOKENS: {
    REPO_SUMMARY: 800,  // ~600 words for detailed project description
    USER_INTRO: 600     // ~450 words for professional introduction
  },
  TIMEOUT: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
  MAX_RETRIES: parseInt(process.env.OPENAI_MAX_RETRIES || '2'),
  DEFAULT_MODEL: process.env.OPENAI_API_MODEL || "gpt-4o",
  README_MAX_LENGTH: 2000 // Maximum README characters to send to LLM
} as const;

const DEFAULT_PROMPT =
  "Generate a comprehensive yet readable project summary for a developer portfolio. The summary should be 200-300 words, providing enough detail to showcase the project's purpose, technical approach, and impact without being overwhelming. Focus on what makes this project interesting and valuable, highlighting technical challenges solved, technologies used effectively, and potential impact. Write in a professional tone that demonstrates the developer's capabilities and technical expertise.";
const JSON_FORMAT_SUFFIX =
  "Respond with JSON in this format: { 'summary': string }";
const USER_INTRO_PROMPT =
  "Based on the repository information, generate a compelling professional introduction for a developer portfolio. The introduction should be 150-200 words, showcasing the developer's expertise, technical journey, and what drives their work. Highlight their strongest technical skills, preferred technologies, and areas of specialization. Make it personal yet professional, demonstrating both technical competence and passion for development. Include 8-12 primary skills and 4-6 areas of interest that reflect their technical focus and career direction.";
const USER_INTRO_FORMAT =
  "Respond with JSON in this format: { 'introduction': string, 'skills': string[], 'interests': string[] }";

/**
 * Intelligently truncates text at natural boundaries
 * Tries to break at paragraphs, then sentences, then words
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length in characters
 * @returns Truncated text with ellipsis if needed
 */
function intelligentTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to break at paragraph (80% threshold)
  const nearEndParagraph = text.lastIndexOf('\n\n', maxLength);
  if (nearEndParagraph > maxLength * 0.8) {
    return text.substring(0, nearEndParagraph) + '\n\n...';
  }

  // Try to break at sentence
  const nearEndSentence = text.lastIndexOf('. ', maxLength);
  if (nearEndSentence > maxLength * 0.8) {
    return text.substring(0, nearEndSentence + 1) + ' ...';
  }

  // Try to break at word boundary
  const nearEndWord = text.lastIndexOf(' ', maxLength);
  if (nearEndWord > maxLength * 0.8) {
    return text.substring(0, nearEndWord) + ' ...';
  }

  // Last resort: hard cut
  return text.substring(0, maxLength) + '...';
}

/**
 * Singleton OpenAI client instance
 * Reused across requests for better performance
 */
let openaiClient: OpenAI | null = null;

/**
 * Gets or creates an OpenAI client instance
 * Uses singleton pattern to avoid recreating the client on every request
 *
 * @param apiKey - OpenAI API key
 * @returns OpenAI client instance
 */
function getOpenAIClient(apiKey: string): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey,
      timeout: LLM_CONFIG.TIMEOUT,
      maxRetries: LLM_CONFIG.MAX_RETRIES,
      ...(process.env.OPENAI_API_BASE_URL && { baseURL: process.env.OPENAI_API_BASE_URL })
    });

    console.log('✓ OpenAI client initialized');
  }

  return openaiClient;
}

async function generateWithOpenAI(
  prompt: string,
  userContent: string,
  apiKey: string,
): Promise<RepoSummary> {
  try {
    const openai = getOpenAIClient(apiKey);
    
    const response = await openai.chat.completions.create({
      model: LLM_CONFIG.DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      response_format: { type: "json_object" },
      temperature: LLM_CONFIG.TEMPERATURE,
      max_tokens: LLM_CONFIG.MAX_TOKENS.REPO_SUMMARY,
    });
    
    // Check if response structure is valid
    if (!response || !response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
      console.error("Invalid response structure:", response);
      throw new Error("Invalid response structure from LLM API");
    }
    
    const choice = response.choices[0];
    if (!choice || !choice.message) {
      console.error("Invalid choice structure:", choice);
      throw new Error("Invalid choice structure in LLM response");
    }
    
    const content = choice.message.content;
    if (!content) {
      console.error("No content in message:", choice.message);
      throw new Error("No content in LLM response message");
    }

    try {
      const parsed = JSON.parse(content) as RepoSummary;
      return parsed;
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      console.error("Raw content:", content);
      throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  } catch (error) {
    console.error("Error in generateWithOpenAI:", error);
    throw error;
  }
}

async function generateRepoSummary(
  name: string,
  description: string,
  readme: string,
  apiKey: string,
  customPrompt?: string,
  metadata?: {
    language: string | null;
    topics: string[];
    stars: number;
    url?: string | null;
  },
  accessToken?: string,
  owner?: string
): Promise<RepoSummary> {
  try {
    // Build enhanced context with metadata
    const userContentParts: string[] = [`Repository Name: ${name}`];
    
    if (description) {
      userContentParts.push(`Description: ${description}`);
    }
    
    if (metadata) {
      if (metadata.language) {
        userContentParts.push(`Primary Language: ${metadata.language}`);
      }
      
      if (metadata.topics && metadata.topics.length > 0) {
        userContentParts.push(`Topics/Tags: ${metadata.topics.join(', ')}`);
      }
      
      if (metadata.stars > 0) {
        userContentParts.push(`Stars: ${metadata.stars}`);
      }
      
      if (metadata.url) {
        userContentParts.push(`Project URL: ${metadata.url}`);
      }
    }

    // Handle README content or fallback to project structure analysis
    if (readme && readme.trim()) {
      // Clean the README content to remove badges and noise
      const cleanedReadme = cleanReadmeContent(readme);
      const trimmedReadme = intelligentTruncate(cleanedReadme, LLM_CONFIG.README_MAX_LENGTH);

      userContentParts.push(`README:\n${trimmedReadme}`);
    } else if (accessToken && owner) {
      try {
        // Analyze project structure when README is not available
        const projectStructure = await analyzeProjectStructure(accessToken, owner, name);
        const structureSummary = generateProjectSummary(projectStructure);
        
        userContentParts.push(`Project Structure Analysis:\n${structureSummary}`);
        
        // Add detailed structure information
        if (projectStructure.frameworkIndicators.length > 0) {
          userContentParts.push(`Detected Frameworks: ${projectStructure.frameworkIndicators.map(f => f.framework).join(', ')}`);
        }
        
        if (projectStructure.techStack.length > 0) {
          userContentParts.push(`Tech Stack: ${projectStructure.techStack.join(', ')}`);
        }
        
        if (projectStructure.sourceFiles.length > 0) {
          const entryPoints = projectStructure.sourceFiles.filter(f => f.isEntryPoint);
          if (entryPoints.length > 0) {
            userContentParts.push(`Entry Points: ${entryPoints.map(f => f.name).join(', ')}`);
          }
          
          const languages = Array.from(new Set(projectStructure.sourceFiles.map(f => f.language)));
          userContentParts.push(`Languages Used: ${languages.join(', ')}`);
        }
        
        if (projectStructure.packageFiles.length > 0) {
          const packageInfo = projectStructure.packageFiles[0];
          if (packageInfo.description) {
            userContentParts.push(`Package Description: ${packageInfo.description}`);
          }
          if (packageInfo.dependencies && packageInfo.dependencies.length > 0) {
            const majorDeps = packageInfo.dependencies.slice(0, 10); // Limit to avoid token overflow
            userContentParts.push(`Key Dependencies: ${majorDeps.join(', ')}`);
          }
        }
        
      } catch (error) {
        console.warn("Failed to analyze project structure:", error);
        userContentParts.push(`Note: No README available and project structure analysis failed. Analysis based on repository metadata only.`);
      }
    } else {
      userContentParts.push(`Note: No README available. Analysis based on repository metadata only.`);
    }

    const userContent = userContentParts.join('\n');

    const prompt = `${customPrompt || DEFAULT_PROMPT}
    
Additional context: This summary will be displayed in a developer portfolio to showcase technical skills and project impact. Focus on:
- Technical challenges solved and approaches used
- Technologies and frameworks utilized effectively
- Project outcomes and potential impact
- Code quality and development practices demonstrated

${JSON_FORMAT_SUFFIX}`;
    
    try {
      const result = await generateWithOpenAI(prompt, userContent, apiKey);
      return result;
    } catch (llmError) {
      console.error("LLM generation error:", llmError);
      throw llmError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to generate summary:", errorMessage);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    throw new Error("Failed to generate summary: " + errorMessage);
  }
}

async function generateUserIntroduction(
  repositories: Array<{
    name: string;
    description: string;
    metadata: {
      language: string | null;
      topics: string[];
    };
    summary?: string;
  }>,
  apiKey: string,
): Promise<UserIntroduction> {
  try {
    const repoInfo = repositories.map((repo) => ({
      name: repo.name,
      description: repo.description,
      language: repo.metadata.language,
      topics: repo.metadata.topics,
      summary: repo.summary,
    }));

    const prompt = `${USER_INTRO_PROMPT} ${USER_INTRO_FORMAT}`;
    const userContent = JSON.stringify(repoInfo, null, 2);

    const openai = getOpenAIClient(apiKey);

    const response = await openai.chat.completions.create({
      model: LLM_CONFIG.DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      response_format: { type: "json_object" },
      temperature: LLM_CONFIG.TEMPERATURE,
      max_tokens: LLM_CONFIG.MAX_TOKENS.USER_INTRO,
    });

    // Check if response structure is valid
    if (!response || !response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
      console.error("Invalid response structure:", response);
      throw new Error("Invalid response structure from LLM API");
    }

    const choice = response.choices[0];
    if (!choice || !choice.message) {
      console.error("Invalid choice structure:", choice);
      throw new Error("Invalid choice structure in LLM response");
    }

    const content = choice.message.content;
    if (!content) {
      console.error("No content in message:", choice.message);
      throw new Error("No content in LLM response message");
    }

    try {
      const parsed = JSON.parse(content) as UserIntroduction;
      return parsed;
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      console.error("Raw content:", content);
      throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  } catch (error) {
    console.error("Failed to generate user introduction:", error);
    throw new Error(
      `Failed to generate user introduction: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function generateContentSummary(
  title: string,
  content: string,
  contentType: string,
  apiKey: string,
  metadata?: {
    author?: string;
    publishedAt?: string;
    tags?: string[];
    url?: string;
  }
): Promise<{ summary: string }> {
  try {
    // Build enhanced context with metadata
    const userContentParts: string[] = [`Title: ${title}`];

    if (metadata) {
      if (metadata.author) {
        userContentParts.push(`Author: ${metadata.author}`);
      }
      if (metadata.publishedAt) {
        userContentParts.push(`Published At: ${metadata.publishedAt}`);
      }
      if (metadata.tags && metadata.tags.length > 0) {
        userContentParts.push(`Tags: ${metadata.tags.join(', ')}`);
      }
      if (metadata.url) {
        userContentParts.push(`URL: ${metadata.url}`);
      }
    }

    userContentParts.push(`Content Type: ${contentType}`);
    userContentParts.push(`Content:\n${content}`);

    const userContent = userContentParts.join('\n');

    const prompt = `Based on the provided content, generate a brief professional summary suitable for a developer portfolio. Ensure the response is in JSON format with a "summary" field.\n\n${JSON_FORMAT_SUFFIX}`;

    const result = await generateWithOpenAI(prompt, userContent, apiKey);

    // Cast appropriately since generateWithOpenAI parses the JSON
    return result as unknown as { summary: string };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to generate content summary:", errorMessage);
    throw new Error("Failed to generate content summary: " + errorMessage);
  }
}

export {
  generateContentSummary,
  generateRepoSummary,
  generateUserIntroduction,
  generateContentSummary,
  type RepoSummary,
  type UserIntroduction,
};

/**
 * Generates a summary for generic content (e.g., blog posts, medium articles, freeform text)
 */
async function generateContentSummary(
  title: string,
  content: string,
  type: string,
  apiKey: string,
  options?: any
): Promise<RepoSummary> {
  const prompt = `Generate a compelling and informative summary for this ${type} content. The summary should be 100-200 words, capturing the main ideas, key takeaways, and the value it provides to the reader. Write in a professional, engaging tone suitable for a developer portfolio.

${JSON_FORMAT_SUFFIX}`;

  const userContent = JSON.stringify({
    title,
    content: intelligentTruncate(content, LLM_CONFIG.README_MAX_LENGTH),
    type,
    options
  }, null, 2);

  try {
    const result = await generateWithOpenAI(prompt, userContent, apiKey);
    return result as RepoSummary;
  } catch (error) {
    console.error(`Failed to generate ${type} summary:`, error);
    // Return a fallback summary
    return { summary: `${title} - A ${type.replace('_', ' ')}` };
  }
}
