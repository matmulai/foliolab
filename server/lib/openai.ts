import OpenAI from "openai";
import { cleanReadmeContent } from "./readme-cleaner.js";
import { analyzeProjectStructure, generateProjectSummary, type ProjectStructure } from "./project-analyzer.js";

interface RepoSummary {
  summary: string;
  keyFeatures: string[];
}

interface UserIntroduction {
  introduction: string;
  skills: string[];
  interests: string[];
}

const DEFAULT_PROMPT =
  "Generate a concise project summary and key features list from the repository information. Keep the summary under 150 words and limit key features to 3-5 bullet points.";
const JSON_FORMAT_SUFFIX =
  "Respond with JSON in this format: { 'summary': string, 'keyFeatures': string[] }";
const USER_INTRO_PROMPT =
  "Based on the repository information, generate a professional introduction that highlights the developer's expertise, interests, and technical focus. Include a list of their primary skills and areas of interest.";
const USER_INTRO_FORMAT =
  "Respond with JSON in this format: { 'introduction': string, 'skills': string[], 'interests': string[] }";



async function generateWithOpenAI(
  prompt: string,
  userContent: string,
  apiKey: string,
): Promise<RepoSummary> {
  console.log("using open ai base url", process.env.OPENAI_API_BASE_URL)
  console.log("using open ai model", process.env.OPENAI_API_MODEL)
  const openai = new OpenAI({
    apiKey,
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
    max_tokens: 500,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  return JSON.parse(content) as RepoSummary;
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
    console.log("Generating repo summary for:", {
      name,
      descriptionLength: description?.length,
      readmeLength: readme?.length,
      hasCustomPrompt: !!customPrompt,
      metadata: metadata ? {
        language: metadata.language,
        topicsCount: metadata.topics.length,
        stars: metadata.stars
      } : null
    });

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
      console.log("Using README content for analysis");
      // Clean the README content to remove badges and noise
      const cleanedReadme = cleanReadmeContent(readme);
      
      const maxReadmeLength = 2000;
      const trimmedReadme =
        cleanedReadme.length > maxReadmeLength
          ? cleanedReadme.substring(0, maxReadmeLength) + "..."
          : cleanedReadme;
      
      userContent += `\nREADME:\n${trimmedReadme}`;
    } else if (accessToken && owner) {
      console.log("No README found, analyzing project structure...");
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
        
        console.log("Project structure analysis completed successfully");
      } catch (error) {
        console.warn("Failed to analyze project structure:", error);
        userContent += `\nNote: No README available and project structure analysis failed. Analysis based on repository metadata only.`;
      }
    } else {
      console.log("No README and insufficient data for structure analysis");
      userContent += `\nNote: No README available. Analysis based on repository metadata only.`;
    }

    const prompt = `${customPrompt || DEFAULT_PROMPT} ${JSON_FORMAT_SUFFIX}`;

    console.log("Using OpenAI API for generation with enhanced metadata context");
    return generateWithOpenAI(prompt, userContent, apiKey);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to generate summary:", errorMessage);
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
    console.log("Generating user introduction based on repositories");

    const repoInfo = repositories.map((repo) => ({
      name: repo.name,
      description: repo.description,
      language: repo.metadata.language,
      topics: repo.metadata.topics,
      summary: repo.summary,
    }));

    const prompt = `${USER_INTRO_PROMPT} ${USER_INTRO_FORMAT}`;
    const userContent = JSON.stringify(repoInfo, null, 2);

    const openai = new OpenAI({
      apiKey,
      ...(process.env.OPENAI_API_BASE_URL && { baseURL: process.env.OPENAI_API_BASE_URL })
    });
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_API_MODEL || "gpt-4o", // defaults to gpt-4o, can be overridden with OPENAI_API_MODEL env var
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
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    return JSON.parse(content) as UserIntroduction;
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
