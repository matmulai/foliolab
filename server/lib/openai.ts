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
    let userContent = `Repository Name: ${name}`;
    
    if (description) {
      userContent += `\nDescription: ${description}`;
    }
    
    if (metadata) {
      if (metadata.language) {
        userContent += `\nPrimary Language: ${metadata.language}`;
      }
      
      if (metadata.topics && metadata.topics.length > 0) {
        userContent += `\nTopics/Tags: ${metadata.topics.join(', ')}`;
      }
      
      if (metadata.stars > 0) {
        userContent += `\nStars: ${metadata.stars}`;
      }
      
      if (metadata.url) {
        userContent += `\nProject URL: ${metadata.url}`;
      }
    }

    // Handle README content or fallback to project structure analysis
    if (readme && readme.trim()) {
      // Clean the README content to remove badges and noise
      const cleanedReadme = cleanReadmeContent(readme);
      const trimmedReadme = intelligentTruncate(cleanedReadme, LLM_CONFIG.README_MAX_LENGTH);

      userContent += `\nREADME:\n${trimmedReadme}`;
    } else if (accessToken && owner) {
      try {
        // Analyze project structure when README is not available
        const projectStructure = await analyzeProjectStructure(accessToken, owner, name);
        const structureSummary = generateProjectSummary(projectStructure);
        
        userContent += `\nProject Structure Analysis:\n${structureSummary}`;
        
        // Add detailed structure information
        if (projectStructure.frameworkIndicators.length > 0) {
          userContent += `\nDetected Frameworks: ${projectStructure.frameworkIndicators.map(f => f.framework).join(', ')}`;
        }
        
        if (projectStructure.techStack.length > 0) {
          userContent += `\nTech Stack: ${projectStructure.techStack.join(', ')}`;
        }
        
        if (projectStructure.sourceFiles.length > 0) {
          const entryPoints = projectStructure.sourceFiles.filter(f => f.isEntryPoint);
          if (entryPoints.length > 0) {
            userContent += `\nEntry Points: ${entryPoints.map(f => f.name).join(', ')}`;
          }
          
          const languages = Array.from(new Set(projectStructure.sourceFiles.map(f => f.language)));
          userContent += `\nLanguages Used: ${languages.join(', ')}`;
        }
        
        if (projectStructure.packageFiles.length > 0) {
          const packageInfo = projectStructure.packageFiles[0];
          if (packageInfo.description) {
            userContent += `\nPackage Description: ${packageInfo.description}`;
          }
          if (packageInfo.dependencies && packageInfo.dependencies.length > 0) {
            const majorDeps = packageInfo.dependencies.slice(0, 10); // Limit to avoid token overflow
            userContent += `\nKey Dependencies: ${majorDeps.join(', ')}`;
          }
        }
        
      } catch (error) {
        console.warn("Failed to analyze project structure:", error);
        userContent += `\nNote: No README available and project structure analysis failed. Analysis based on repository metadata only.`;
      }
    } else {
      userContent += `\nNote: No README available. Analysis based on repository metadata only.`;
    }

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
  items: Array<any>,
  apiKey: string,
): Promise<UserIntroduction> {
  try {
    // Extract information from all portfolio items
    const portfolioInfo = items.map((item) => {
      const baseInfo: any = {
        title: item.title || item.name,
        type: item.source,
        summary: item.summary,
      };

      if (item.source === 'github' || item.source === 'gitlab' || item.source === 'bitbucket') {
        baseInfo.description = item.description;
        baseInfo.language = item.metadata?.language;
        baseInfo.topics = item.metadata?.topics;
      } else if (item.source === 'blog_rss' || item.source === 'medium') {
        baseInfo.description = item.description;
        baseInfo.tags = item.tags;
        baseInfo.author = item.author;
      } else if (item.source === 'freeform') {
        baseInfo.contentType = item.contentType;
        baseInfo.tags = item.tags;
        baseInfo.description = item.description;
      }

      return baseInfo;
    });

    const prompt = `Based on the portfolio items (including repositories, blog posts, articles, and projects), generate a compelling professional introduction for a developer portfolio. The introduction should be 150-200 words, showcasing the developer's expertise, technical journey, and what drives their work. Highlight their strongest technical skills, preferred technologies, and areas of specialization based on ALL their work including code repositories, technical writing, and projects. Make it personal yet professional, demonstrating both technical competence and passion for development. Include 8-12 primary skills and 4-6 areas of interest that reflect their technical focus and career direction across all their portfolio items.

${USER_INTRO_FORMAT}`;
    const userContent = JSON.stringify(portfolioInfo, null, 2);

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
  contentType: 'blog_post' | 'medium_post' | 'freeform',
  apiKey: string,
  metadata?: {
    author?: string | null;
    publishedAt?: string;
    tags?: string[];
    url?: string;
  }
): Promise<RepoSummary> {
  try {
    let userContent = `Title: ${title}`;

    if (metadata) {
      if (metadata.author) {
        userContent += `\nAuthor: ${metadata.author}`;
      }

      if (metadata.publishedAt) {
        userContent += `\nPublished: ${new Date(metadata.publishedAt).toLocaleDateString()}`;
      }

      if (metadata.tags && metadata.tags.length > 0) {
        userContent += `\nTags: ${metadata.tags.join(', ')}`;
      }

      if (metadata.url) {
        userContent += `\nURL: ${metadata.url}`;
      }
    }

    // Truncate content intelligently
    const trimmedContent = intelligentTruncate(content, LLM_CONFIG.README_MAX_LENGTH);
    userContent += `\nContent:\n${trimmedContent}`;

    const contentTypeLabel = contentType === 'blog_post' ? 'blog post' :
                            contentType === 'medium_post' ? 'Medium article' :
                            'portfolio content';

    const prompt = `Generate a compelling summary for this ${contentTypeLabel} for a developer portfolio. The summary should be 150-250 words, highlighting the key insights, technical concepts, or achievements discussed. Make it engaging and showcase the author's expertise and thought process. Focus on what makes this content valuable and what readers will learn or gain from it.

${JSON_FORMAT_SUFFIX}`;

    const result = await generateWithOpenAI(prompt, userContent, apiKey);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to generate content summary:", errorMessage);
    throw new Error("Failed to generate content summary: " + errorMessage);
  }
}

export {
  generateRepoSummary,
  generateUserIntroduction,
  generateContentSummary,
  type RepoSummary,
  type UserIntroduction,
};
