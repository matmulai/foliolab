import OpenAI from "openai";

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
): Promise<RepoSummary> {
  try {
    console.log("Generating repo summary for:", {
      name,
      descriptionLength: description?.length,
      readmeLength: readme?.length,
      hasCustomPrompt: !!customPrompt
    });

    const maxReadmeLength = 2000;
    const trimmedReadme =
      readme.length > maxReadmeLength
        ? readme.substring(0, maxReadmeLength) + "..."
        : readme;

    const prompt = `${customPrompt || DEFAULT_PROMPT} ${JSON_FORMAT_SUFFIX}`;
    const userContent = `Repository Name: ${name}\nDescription: ${description}\nREADME:\n${trimmedReadme}`;

    console.log("Using OpenAI API for generation");
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
