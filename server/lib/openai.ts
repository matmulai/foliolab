import OpenAI from "openai";
import fetch from "node-fetch";

interface RepoSummary {
  summary: string;
  keyFeatures: string[];
}

const DEFAULT_PROMPT = "Generate a concise project summary and key features list from the repository information. Keep the summary under 150 words and limit key features to 3-5 bullet points.";

const JSON_FORMAT_SUFFIX = "Respond with JSON in this format: { 'summary': string, 'keyFeatures': string[] }";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_DEFAULT_MODEL = "google/gemini-2.0-flash-lite-preview-02-05:free";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_MODEL;

async function generateWithOpenRouter(prompt: string, userContent: string): Promise<RepoSummary> {
  console.log('Making OpenRouter API request with:', {
    url: OPENROUTER_API_URL,
    model: OPENROUTER_MODEL,
    prompt,
    contentLength: userContent.length
  });

  const requestBody = {
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
  };

  console.log('OpenRouter request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://replit.com",
      "X-Title": "FolioLab",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('OpenRouter API response:', JSON.stringify(data, null, 2));

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
    console.log('Generating repo summary for:', {
      name,
      descriptionLength: description?.length,
      readmeLength: readme?.length,
      usingOpenAI: !!apiKey,
      hasCustomPrompt: !!customPrompt,
      openrouterModel: OPENROUTER_MODEL
    });

    // Prepare a concise input by trimming the README to essential parts
    const maxReadmeLength = 2000;
    const trimmedReadme = readme.length > maxReadmeLength 
      ? readme.substring(0, maxReadmeLength) + "..."
      : readme;

    const prompt = `${customPrompt || DEFAULT_PROMPT} ${JSON_FORMAT_SUFFIX}`;
    const userContent = `Repository Name: ${name}\nDescription: ${description}\nREADME:\n${trimmedReadme}`;

    // If no API key is provided, use OpenRouter
    if (!apiKey) {
      console.log('Using OpenRouter API for generation with model:', OPENROUTER_MODEL);
      return generateWithOpenRouter(prompt, userContent);
    }

    // Otherwise use OpenAI
    console.log('Using OpenAI API for generation');
    return generateWithOpenAI(prompt, userContent, apiKey);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to generate summary:', errorMessage);
    throw new Error("Failed to generate summary: " + errorMessage);
  }
}