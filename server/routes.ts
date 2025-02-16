import type { Express } from "express";
import { createServer } from "http";
import { getRepositories, getReadmeContent, getGithubUser, createPortfolioRepository, commitPortfolioFiles, deployToGitHubPages } from "./lib/github.js";
import { generateRepoSummary } from "./lib/openai.js";
import { Repository } from "@shared/schema.js";

// In-memory storage for the current session
let selectedRepos: Repository[] = [];

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  app.post("/api/fetch-repos", async (req, res) => {
    const { code } = req.body;
    try {
      if (!code) {
        return res.status(400).json({ error: "Authorization code is required" });
      }

      console.log("Exchanging code for access token...");

      // Get the base URL based on environment and hostname
      let baseUrl = req.protocol + '://' + req.get('host');
      console.log("Full request details:", {
        protocol: req.protocol,
        host: req.get('host'),
        originalUrl: req.originalUrl,
        baseUrl: baseUrl
      });

      // Log current configuration and request details
      console.log("OAuth Configuration:", {
        baseUrl,
        host: req.headers.host,
        clientIdExists: !!process.env.GITHUB_CLIENT_ID,
        clientSecretExists: !!process.env.GITHUB_CLIENT_SECRET,
        code: code.substring(0, 8) + "..."
      });

      // Create form-urlencoded body using URLSearchParams
      const params = new URLSearchParams();
      params.append('client_id', process.env.GITHUB_CLIENT_ID!);
      params.append('client_secret', process.env.GITHUB_CLIENT_SECRET!);
      params.append('code', code);

      console.log("Request parameters:", {
        url: "https://github.com/login/oauth/access_token",
        params: Object.fromEntries(params.entries())
      });

      try {
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

        // Log response status and headers
        console.log("GitHub API Response:", {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          headers: Object.fromEntries(tokenResponse.headers.entries())
        });

        const responseText = await tokenResponse.text();
        console.log("Raw GitHub response:", responseText);

        let tokenData;
        try {
          tokenData = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse GitHub response:", e);
          throw new Error(`Invalid response from GitHub: ${responseText}`);
        }

        if (tokenData.error) {
          throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
        }

        if (!tokenData.access_token) {
          throw new Error("No access token in GitHub response");
        }

        // Get user info and repositories
        const githubUser = await getGithubUser(tokenData.access_token);
        const repos = await getRepositories(tokenData.access_token);
        selectedRepos = repos.map((repo, index) => ({
          ...repo,
          id: index + 1,
          selected: false,
          summary: null
        }));

        res.json({
          repositories: selectedRepos,
          accessToken: tokenData.access_token,
          username: githubUser.username
        });
      } catch (error) {
        console.error("Token exchange error:", error);
        throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      res.status(500).json({
        error: "Failed to fetch repositories",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/repositories/:id/select", async (req, res) => {
    const { id } = req.params;
    const { selected } = req.body;
    try {
      const repoIndex = selectedRepos.findIndex(r => r.id === parseInt(id));
      if (repoIndex === -1) {
        return res.status(404).json({ error: "Repository not found" });
      }
      selectedRepos[repoIndex].selected = selected;
      res.json({ repository: selectedRepos[repoIndex] });
    } catch (error) {
      console.error('Failed to update repository:', error);
      res.status(500).json({ error: "Failed to update repository" });
    }
  });

  app.post("/api/repositories/:id/analyze", async (req, res) => {
    const { id } = req.params;
    const { accessToken, username, openaiKey } = req.body;

    if (!accessToken || !username) {
      return res.status(400).json({ error: "Access token and username are required" });
    }

    if (!openaiKey) {
      return res.status(400).json({ error: "OpenAI API key is required" });
    }

    try {
      const repoIndex = selectedRepos.findIndex(r => r.id === parseInt(id));
      if (repoIndex === -1) {
        return res.status(404).json({ error: "Repository not found" });
      }

      const repo = selectedRepos[repoIndex];
      const readme = await getReadmeContent(
        accessToken,
        username,
        repo.name
      ) || '';

      const summary = await generateRepoSummary(
        repo.name,
        repo.description || '',
        readme,
        openaiKey
      );

      selectedRepos[repoIndex] = {
        ...repo,
        summary: summary.summary
      };

      res.json({ repository: selectedRepos[repoIndex] });
    } catch (error) {
      console.error('Failed to analyze repository:', error);
      res.status(500).json({
        error: "Failed to analyze repository",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/repositories", (_req, res) => {
    res.json({ repositories: selectedRepos });
  });

  app.post("/api/deploy/github", async (req, res) => {
    const { accessToken, downloadOnly } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "GitHub access token is required" });
    }

    try {
      const user = await getGithubUser(accessToken);
      const displayRepos = selectedRepos.filter(repo => repo.selected);
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${user.username}'s Portfolio</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="container mx-auto px-4 py-20">
        <header class="text-center mb-16">
            <h1 class="text-4xl font-bold mb-4">My Projects</h1>
            <p class="text-gray-600">A showcase of my work</p>
        </header>
        <div class="grid gap-8 max-w-4xl mx-auto">
            ${displayRepos.map(repo => `
                <article class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-2xl font-semibold mb-2">${repo.name}</h2>
                    <p class="text-gray-600 mb-4">${repo.summary || repo.description || ''}</p>
                    <div class="flex gap-2 flex-wrap">
                        ${repo.metadata.topics.map(topic => 
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
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "GitHub access token is required" });
    }

    try {
      const user = await getGithubUser(accessToken);
      const displayRepos = selectedRepos.filter(repo => repo.selected);
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${user.username}'s Portfolio</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="container mx-auto px-4 py-20">
        <header class="text-center mb-16">
            <h1 class="text-4xl font-bold mb-4">My Projects</h1>
            <p class="text-gray-600">A showcase of my work</p>
        </header>
        <div class="grid gap-8 max-w-4xl mx-auto">
            ${displayRepos.map(repo => `
                <article class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-2xl font-semibold mb-2">${repo.name}</h2>
                    <p class="text-gray-600 mb-4">${repo.summary || repo.description || ''}</p>
                    <div class="flex gap-2 flex-wrap">
                        ${repo.metadata.topics.map(topic => 
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

  return httpServer;
}