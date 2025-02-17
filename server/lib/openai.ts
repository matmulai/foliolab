import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
interface RepoSummary {
  summary: string;
  keyFeatures: string[];
}

export async function generateRepoSummary(name: string, description: string, readme: string, apiKey: string): Promise<RepoSummary> {
  try {
    const openai = new OpenAI({ apiKey });

    // Prepare a concise input by trimming the README to essential parts
    const maxReadmeLength = 2000; // Limit readme length for faster processing
    const trimmedReadme = readme.length > maxReadmeLength 
      ? readme.substring(0, maxReadmeLength) + "..."
      : readme;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Generate a concise project summary and key features list from the repository information. Keep the summary under 150 words and limit key features to 3-5 bullet points. Respond with JSON in this format: { 'summary': string, 'keyFeatures': string[] }"
        },
        {
          role: "user",
          content: `Repository Name: ${name}\nDescription: ${description}\nREADME:\n${trimmedReadme}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7, // Add some variability but keep it focused
      max_tokens: 500 // Limit response length for faster processing
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