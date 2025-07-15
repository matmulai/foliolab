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

const DEFAULT_PROMPT =
  "Generate a comprehensive yet readable project summary for a developer portfolio. The summary should be 200-300 words, providing enough detail to showcase the project's purpose, technical approach, and impact without being overwhelming. Focus on what makes this project interesting and valuable, highlighting technical challenges solved, technologies used effectively, and potential impact. Write in a professional tone that demonstrates the developer's capabilities and technical expertise.";
const JSON_FORMAT_SUFFIX =
  "Respond with JSON in this format: { 'summary': string }";
const USER_INTRO_PROMPT =
  "Based on the repository information, generate a compelling professional introduction for a developer portfolio. The introduction should be 150-200 words, showcasing the developer's expertise, technical journey, and what drives their work. Highlight their strongest technical skills, preferred technologies, and areas of specialization. Make it personal yet professional, demonstrating both technical competence and passion for development. Include 8-12 primary skills and 4-6 areas of interest that reflect their technical focus and career direction.";
const USER_INTRO_FORMAT =
  "Respond with JSON in this format: { 'introduction': string, 'skills': string[], 'interests': string[] }";

async function generateWithOpenAI(
  prompt: string,
  userContent: string,
  apiKey: string,
): Promise<RepoSummary> {
  const timeout = parseInt(process.env.OPENAI_TIMEOUT || '60000');
  const maxRetries = parseInt(process.env.OPENAI_MAX_RETRIES || '2');
  
  try {
    const openai = new OpenAI({
      apiKey,
      timeout, // Configurable timeout
      maxRetries, // Configurable retries
      ...(process.env.OPENAI_API_BASE_URL && { baseURL: process.env.OPENAI_API_BASE_URL })
    });
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_API_MODEL || "gpt-4o",
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
      temperature: 0.7,
      max_tokens: 800,
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
      
      const maxReadmeLength = 2000;
      const trimmedReadme =
        cleanedReadme.length > maxReadmeLength
          ? cleanedReadme.substring(0, maxReadmeLength) + "..."
          : cleanedReadme;
      
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

    const timeout = parseInt(process.env.OPENAI_TIMEOUT || '60000');
    const maxRetries = parseInt(process.env.OPENAI_MAX_RETRIES || '2');
    
    const openai = new OpenAI({
      apiKey,
      timeout,
      maxRetries,
      ...(process.env.OPENAI_API_BASE_URL && { baseURL: process.env.OPENAI_API_BASE_URL })
    });
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_API_MODEL || "gpt-4o",
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
      temperature: 0.7,
      max_tokens: 600,
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

export {
  generateRepoSummary,
  generateUserIntroduction,
  type RepoSummary,
  type UserIntroduction,
};
