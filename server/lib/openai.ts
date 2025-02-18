import OpenAI from "openai";
import fetch from "node-fetch";

interface RepoSummary {
  summary: string;
  keyFeatures: string[];
}

const DEFAULT_PROMPT = "Generate a concise project summary and key features list from the repository information. Keep the summary under 150 words and limit key features to 3-5 bullet points.";

const JSON_FORMAT_SUFFIX = "Respond with JSON in this format: { 'summary': string, 'keyFeatures': string[] }";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "cognitivecomputations/dolphin3.0-r1-mistral-24b:free";

async function generateWithOpenRouter(prompt: string, userContent: string): Promise<RepoSummary> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "X-Title": "FolioLab",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: userContent
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content) as RepoSummary;
}

async function generateWithOpenAI(
  prompt: string,
  userContent: string,
  apiKey: string
): Promise<RepoSummary> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: prompt
      },
      {
        role: "user",
        content: userContent
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 500
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  return JSON.parse(content) as RepoSummary;
}

export async function generateRepoSummary(
  name: string, 
  description: string, 
  readme: string, 
  apiKey?: string,
  customPrompt?: string
): Promise<RepoSummary> {
  try {
    // Prepare a concise input by trimming the README to essential parts
    const maxReadmeLength = 2000;
    const trimmedReadme = readme.length > maxReadmeLength 
      ? readme.substring(0, maxReadmeLength) + "..."
      : readme;

    const prompt = `${customPrompt || DEFAULT_PROMPT} ${JSON_FORMAT_SUFFIX}`;
    const userContent = `Repository Name: ${name}\nDescription: ${description}\nREADME:\n${trimmedReadme}`;

    // If no API key is provided, use OpenRouter
    if (!apiKey) {
      return generateWithOpenRouter(prompt, userContent);
    }

    // Otherwise use OpenAI
    return generateWithOpenAI(prompt, userContent, apiKey);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("Failed to generate summary: " + errorMessage);
  }
}