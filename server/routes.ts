import type { Express } from "express";
import { createServer } from "http";
import { getRepositories, getReadmeContent, getGithubUser, createPortfolioRepository, commitPortfolioFiles, deployToGitHubPages } from "./lib/github.js";
import { generateRepoSummary } from "./lib/openai.js";
import { Repository } from "@shared/schema.js";

// In-memory storage for the current session
let selectedRepos: Repository[] = [];
let currentAccessToken: string | null = null;

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

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

      currentAccessToken = tokenData.access_token;
      const githubUser = await getGithubUser(tokenData.access_token);
      const repos = await getRepositories(tokenData.access_token);

      console.log('Raw GitHub repositories:', repos); // Debug log

      // Create a map of existing selections and summaries
      const existingData = new Map(
        selectedRepos.map(repo => [repo.id, { 
          selected: repo.selected,
          summary: repo.summary 
        }])
      );

      // Map repositories to match the Repository type, preserving existing data
      selectedRepos = repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        url: repo.url,
        summary: existingData.get(repo.id)?.summary || null,
        selected: existingData.get(repo.id)?.selected || false,
        metadata: repo.metadata
      }));

      console.log('Mapped repositories with preserved data:', selectedRepos); // Debug log

      res.json({
        repositories: selectedRepos,
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

  app.get("/api/repositories", (_req, res) => {
    console.log('Current repositories state:', selectedRepos); // Debug log
    res.json({ repositories: selectedRepos });
  });

  app.post("/api/repositories/:id/select", async (req, res) => {
    const { id } = req.params;
    const { selected } = req.body;
    const repoId = parseInt(id);

    try {
      console.log('Selection request:', { id: repoId, selected }); // Debug log
      console.log('Current repos state:', selectedRepos.map(r => ({ id: r.id, selected: r.selected }))); // Debug log

      // If selectedRepos is empty and we have an access token, refetch repositories
      if (selectedRepos.length === 0 && currentAccessToken) {
        console.log('Fetching repositories as selectedRepos is empty');
        const repos = await getRepositories(currentAccessToken);
        selectedRepos = repos.map(repo => ({
          id: repo.id,
          name: repo.name,
          description: repo.description,
          url: repo.url,
          summary: null,
          selected: false,
          metadata: repo.metadata
        }));
      }

      const repoIndex = selectedRepos.findIndex(r => r.id === repoId);
      console.log('Repository index:', repoIndex, 'Repos length:', selectedRepos.length); // Debug log

      if (repoIndex === -1) {
        return res.status(404).json({ 
          error: "Repository not found",
          details: `No repository found with ID ${repoId}`
        });
      }

      // Create a new array with the updated repository
      selectedRepos = selectedRepos.map(repo => 
        repo.id === repoId ? { ...repo, selected } : repo
      );

      const updatedRepo = selectedRepos[repoIndex];
      console.log('Updated repository:', updatedRepo); // Debug log

      res.json({ repository: updatedRepo });
    } catch (error) {
      console.error('Failed to update repository:', error);
      res.status(500).json({ 
        error: "Failed to update repository",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/repositories/:id/analyze", async (req, res) => {
    const { id } = req.params;
    const { accessToken, username, openaiKey } = req.body;
    const repoId = parseInt(id);

    if (!accessToken || !username) {
      return res.status(400).json({ error: "Access token and username are required" });
    }

    if (!openaiKey) {
      return res.status(400).json({ error: "OpenAI API key is required" });
    }

    try {
      console.log('Analyze request:', { id: repoId, username }); // Debug log
      console.log('Current repos:', selectedRepos.map(r => ({ id: r.id, name: r.name }))); // Debug log

      // If selectedRepos is empty and we have an access token, refetch repositories
      if (selectedRepos.length === 0) {
        console.log('Fetching repositories as selectedRepos is empty');
        const repos = await getRepositories(accessToken);
        selectedRepos = repos.map(repo => ({
          id: repo.id,
          name: repo.name,
          description: repo.description,
          url: repo.url,
          summary: null,
          selected: false,
          metadata: repo.metadata
        }));
      }

      const repo = selectedRepos.find(r => r.id === repoId);
      if (!repo) {
        return res.status(404).json({ 
          error: "Repository not found",
          details: `No repository found with ID ${repoId}`
        });
      }

      console.log('Found repository to analyze:', repo); // Debug log

      const readme = await getReadmeContent(
        accessToken,
        username,
        repo.name
      ) || '';

      console.log('Fetched README content:', readme ? 'Yes' : 'No'); // Debug log

      const summary = await generateRepoSummary(
        repo.name,
        repo.description || '',
        readme,
        openaiKey
      );

      console.log('Generated summary:', summary); // Debug log

      // Update the repository in the array while maintaining other repositories
      selectedRepos = selectedRepos.map(r => 
        r.id === repoId ? { ...r, summary: summary.summary } : r
      );

      const updatedRepo = selectedRepos.find(r => r.id === repoId);
      console.log('Updated repository with summary:', updatedRepo); // Debug log

      res.json({ repository: updatedRepo });
    } catch (error) {
      console.error('Failed to analyze repository:', error);
      res.status(500).json({
        error: "Failed to analyze repository",
        details: error instanceof Error ? error.message : String(error)
      });
    }
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