import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RepoSummary {
  summary: string;
  keyFeatures: string[];
}

export async function generateRepoSummary(name: string, description: string, readme: string): Promise<RepoSummary> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing GitHub repositories and creating concise, professional summaries. Respond with JSON in this format: { 'summary': string, 'keyFeatures': string[] }"
        },
        {
          role: "user",
          content: `Repository Name: ${name}\nDescription: ${description}\nREADME:\n${readme}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    return JSON.parse(content) as RepoSummary;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("Failed to generate summary: " + errorMessage);
  }
}