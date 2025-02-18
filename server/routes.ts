import type { Express } from "express";
import { createServer } from "http";
import { getRepositories, getReadmeContent, getGithubUser, createPortfolioRepository, commitPortfolioFiles, deployToGitHubPages } from "./lib/github.js";
import { generateRepoSummary } from "./lib/openai.js";

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  app.get("/api/repositories", async (req, res) => {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
      return res.status(401).json({ error: "No access token provided" });
    }

    try {
      // Get fresh repository data from GitHub
      const repos = await getRepositories(accessToken);
      res.json({ repositories: repos });
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      res.status(500).json({
        error: "Failed to fetch repositories",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/fetch-repos", async (req, res) => {
    const { code } = req.body;
    try {
      if (!code) {
        return res.status(400).json({ error: "Authorization code is required" });
      }

      const params = new URLSearchParams();
      params.append('client_id', process.env.GITHUB_CLIENT_ID!);
      params.append('client_secret', process.env.GITHUB_CLIENT_SECRET!);
      params.append('code', code);

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "FolioLab/1.0.0",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        body: params.toString()
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      if (!tokenData.access_token) {
        throw new Error("No access token in GitHub response");
      }

      const githubUser = await getGithubUser(tokenData.access_token);
      const repos = await getRepositories(tokenData.access_token);

      // Return fresh data to be stored on client side
      res.json({
        repositories: repos,
        accessToken: tokenData.access_token,
        username: githubUser.username
      });
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      res.status(500).json({
        error: "Failed to fetch repositories",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/repositories/:id/analyze", async (req, res) => {
    const { id } = req.params;
    const { accessToken, username, openaiKey, customPrompt } = req.body;
    const repoId = parseInt(id);

    if (!accessToken || !username) {
      return res.status(400).json({ error: "Access token and username are required" });
    }

    if (!openaiKey) {
      return res.status(400).json({ error: "OpenAI API key is required" });
    }

    try {
      // Get fresh repository data from GitHub
      const repos = await getRepositories(accessToken);
      const repo = repos.find(r => r.id === repoId);

      if (!repo) {
        return res.status(404).json({ 
          error: "Repository not found",
          details: `No repository found with ID ${repoId}`
        });
      }

      const readme = await getReadmeContent(
        accessToken,
        username,
        repo.name
      ) || '';

      const summary = await generateRepoSummary(
        repo.name,
        repo.description || '',
        readme,
        openaiKey,
        customPrompt
      );

      // Return the repository with the new summary
      res.json({
        repository: {
          ...repo,
          summary: summary.summary
        }
      });
    } catch (error) {
      console.error('Failed to analyze repository:', error);
      res.status(500).json({
        error: "Failed to analyze repository",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/deploy/github", async (req, res) => {
    const { accessToken, downloadOnly, repositories } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "GitHub access token is required" });
    }

    try {
      const user = await getGithubUser(accessToken);
      const html = generatePortfolioHtml(user.username, repositories);

      if (downloadOnly) {
        return res.json({ html });
      }

      const { repoUrl, wasCreated } = await createPortfolioRepository(accessToken, user.username);
      await commitPortfolioFiles(accessToken, user.username, [
        {
          path: "index.html",
          content: html
        }
      ]);

      res.json({
        success: true,
        repoUrl,
        wasCreated,
        message: wasCreated 
          ? "Repository created and portfolio files added successfully"
          : "Portfolio repository updated successfully"
      });
    } catch (error) {
      console.error('Failed to deploy to GitHub:', error);
      res.status(500).json({
        error: "Failed to deploy to GitHub",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/deploy/github-pages", async (req, res) => {
    const { accessToken, repositories } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "GitHub access token is required" });
    }

    try {
      const user = await getGithubUser(accessToken);
      const html = generatePortfolioHtml(user.username, repositories);

      const { url, wasCreated } = await deployToGitHubPages(accessToken, user.username, html);

      res.json({
        success: true,
        url,
        wasCreated,
        message: wasCreated 
          ? "GitHub Pages repository created and portfolio deployed successfully"
          : "Portfolio deployed to GitHub Pages successfully"
      });
    } catch (error) {
      console.error('Failed to deploy to GitHub Pages:', error);
      res.status(500).json({
        error: "Failed to deploy to GitHub Pages",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Helper function to generate portfolio HTML
  function generatePortfolioHtml(username: string, repositories: any[]) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${username}'s Portfolio</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="container mx-auto px-4 py-20">
        <header class="text-center mb-16">
            <h1 class="text-4xl font-bold mb-4">My Projects</h1>
            <p class="text-gray-600">A showcase of my work</p>
        </header>
        <div class="grid gap-8 max-w-4xl mx-auto">
            ${repositories.map(repo => `
                <article class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-2xl font-semibold mb-2">${repo.name}</h2>
                    <p class="text-gray-600 mb-4">${repo.summary || repo.description || ''}</p>
                    <div class="flex gap-2 flex-wrap">
                        ${repo.metadata.topics.map((topic: string) => 
                            `<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">${topic}</span>`
                        ).join('')}
                    </div>
                    <div class="mt-4 flex gap-4">
                        <a href="${repo.url}" class="text-blue-600 hover:underline" target="_blank">View on GitHub</a>
                        ${repo.metadata.url ? 
                            `<a href="${repo.metadata.url}" class="text-blue-600 hover:underline" target="_blank">Live Demo</a>` 
                            : ''}
                    </div>
                </article>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  return httpServer;
}