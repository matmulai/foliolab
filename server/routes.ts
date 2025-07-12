import type { Express } from "express";
import { createServer } from "http";
import { getRepositories, getReadmeContent, getGithubUser, createPortfolioRepository, commitPortfolioFiles, deployToGitHubPages, extractTitleFromReadme } from "./lib/github.js";
import { generateRepoSummary, generateUserIntroduction } from "./lib/openai.js";
import { cleanReadmeContent } from "./lib/readme-cleaner.js";
import { Repository } from "../shared/schema.js";
import { themes } from "../shared/themes.js";
// Import Octokit directly from the github file
// We'll use the existing instance from the github.js file


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
    const { accessToken, username } = req.body;
    const repoId = parseInt(id);

    if (!accessToken || !username) {
      return res.status(400).json({ error: "Access token and username are required" });
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

      let readme = '';
      let displayName = null;
      
      try {
        // Try to fetch README content
        const rawReadme = await getReadmeContent(accessToken, username, repo.name) || '';
        // Clean the README content before processing
        readme = cleanReadmeContent(rawReadme);
        // Extract title from original README (before cleaning) to preserve formatting
        displayName = extractTitleFromReadme(rawReadme);
      } catch (error) {
        console.warn(`Couldn't fetch README for ${repo.name}:`, error);
        // Continue with empty README - don't interrupt the flow
      }
      
      // Use the server's API key from environment variables
      const serverApiKey = process.env.OPENAI_API_KEY;
      
      if (!serverApiKey) {
        return res.status(500).json({
          error: "OpenAI API key not configured",
          details: "OPENAI_API_KEY environment variable is required"
        });
      }
      
      console.log("Starting repository analysis for:", repo.name);
      console.log("Repository metadata:", {
        language: repo.metadata.language,
        topics: repo.metadata.topics,
        stars: repo.metadata.stars,
        hasReadme: !!readme && readme.trim().length > 0
      });
      
      const summary = await generateRepoSummary(
        repo.name,
        repo.description || '',
        readme, // Use cleaned README content
        serverApiKey,
        undefined, // customPrompt
        {
          language: repo.metadata.language,
          topics: repo.metadata.topics,
          stars: repo.metadata.stars,
          url: repo.metadata.url
        },
        accessToken, // Pass access token for project structure analysis
        repo.owner.login // Pass owner for project structure analysis
      );
      
      console.log("Successfully generated summary for:", repo.name);

      // Return the repository with the new summary and display name
      res.json({
        repository: {
          ...repo,
          summary: summary.summary,
          displayName: displayName || repo.displayName
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
    const { accessToken, downloadOnly, repositories, themeId, userInfo, introduction } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "GitHub access token is required" });
    }

    try {
      const user = await getGithubUser(accessToken);
      // Use the provided introduction if available, otherwise generate a new one
      let userIntroduction = introduction;
      
      // Only generate a new introduction if one wasn't provided
      if (!userIntroduction) {
        // Use the server's API key from environment variables
        const serverApiKey = process.env.OPENAI_API_KEY;
        if (!serverApiKey) {
          return res.status(500).json({
            error: "OpenAI API key not configured",
            details: "OPENAI_API_KEY environment variable is required"
          });
        }
        userIntroduction = await generateUserIntroduction(repositories, serverApiKey);
      }
      
      const theme = themes.find(t => t.id === themeId) || themes[1]; // Find theme or default to modern
      const html = generatePortfolioHtml(user.username, repositories, userIntroduction, user.avatarUrl, theme);

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
    const { accessToken, repositories, themeId, userInfo, introduction } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: "GitHub access token is required" });
    }

    if (!Array.isArray(repositories) || repositories.length === 0) {
      return res.status(400).json({ error: "No repositories provided for deployment" });
    }

    try {
      const user = await getGithubUser(accessToken);
      
      // Use the provided introduction if available, otherwise generate a new one
      let userIntroduction = introduction;
      
      // Only generate a new introduction if one wasn't provided
      if (!userIntroduction) {
        // Use the server's API key from environment variables
        const serverApiKey = process.env.OPENAI_API_KEY;
        if (!serverApiKey) {
          return res.status(500).json({
            error: "OpenAI API key not configured",
            details: "OPENAI_API_KEY environment variable is required"
          });
        }
        userIntroduction = await generateUserIntroduction(repositories, serverApiKey);
      }
      
      const theme = themes.find(t => t.id === themeId) || themes[1]; // Find theme or default to modern
      const html = generatePortfolioHtml(user.username, repositories, userIntroduction, user.avatarUrl, theme);

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

  app.post("/api/user/introduction", async (req, res) => {
    const { repositories } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    if (!accessToken) {
      return res.status(401).json({ error: "No access token provided" });
    }

    try {
      const user = await getGithubUser(accessToken);
      // Use the server's API key from environment variables
      const serverApiKey = process.env.OPENAI_API_KEY;
      if (!serverApiKey) {
        return res.status(500).json({
          error: "OpenAI API key not configured",
          details: "OPENAI_API_KEY environment variable is required"
        });
      }
      const introduction = await generateUserIntroduction(repositories, serverApiKey);

      res.json({
        introduction,
        user: {
          username: user.username,
          avatarUrl: user.avatarUrl
        }
      });
    } catch (error) {
      console.error('Failed to generate user introduction:', error);
      res.status(500).json({
        error: "Failed to generate user introduction",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/deploy/vercel/config", (req, res) => {
    res.json({
      integrationSlug: "foliolab",
      redirectUri: `${process.env.APP_URL}/api/deploy/vercel/callback`,
    });
  });

  app.post("/api/deploy/vercel/auth", async (req, res) => {
    const { code } = req.body;

    try {
      const params = new URLSearchParams();
      params.append('client_id', process.env.VERCEL_CLIENT_ID!);
      params.append('client_secret', process.env.VERCEL_CLIENT_SECRET!);
      params.append('code', code);
      params.append('redirect_uri', `${process.env.APP_URL}/api/deploy/vercel/callback`);

      const tokenResponse = await fetch("https://api.vercel.com/v2/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString()
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(`Vercel OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      res.json({
        accessToken: tokenData.access_token,
        teamId: tokenData.team_id // might be null for personal account
      });
    } catch (error) {
      console.error('Vercel OAuth error:', error);
      res.status(500).json({
        error: "Failed to authenticate with Vercel",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/deploy/vercel", async (req, res) => {
    const { accessToken, teamId, username, repositories, themeId, introduction, userInfo } = req.body;

    if (!accessToken || !username) {
      return res.status(400).json({ error: "Vercel access token and username are required" });
    }

    try {
      // First, get user details if not provided
      let userAvatar = null;
      try {
        // Try to get avatarUrl from userInfo in request body
        if (userInfo && userInfo.avatarUrl) {
          userAvatar = userInfo.avatarUrl;
          console.log("Using avatarUrl from userInfo:", userAvatar);
        } 
        // Otherwise try to get it from GitHub
        else {
          const githubToken = req.headers.authorization?.replace('Bearer ', '');
          if (githubToken) {
            const githubUser = await getGithubUser(githubToken);
            userAvatar = githubUser.avatarUrl;
            console.log("Using avatarUrl from GitHub:", userAvatar);
          }
        }
      } catch (userError) {
        console.warn("Could not fetch user avatar:", userError);
      }

      // Generate the portfolio HTML
      const theme = themes.find(t => t.id === themeId) || themes[1]; // Find theme or default to modern
      const html = generatePortfolioHtml(username, repositories, introduction, userAvatar, theme);

      // Create or update the GitHub repository
      const repoName = `${username}-foliolab`;
      const githubToken = req.headers.authorization?.replace('Bearer ', '');

      if (!githubToken) {
        return res.status(401).json({ error: "GitHub token is required" });
      }

      try {
        // Verify GitHub token is valid
        const githubUser = await getGithubUser(githubToken);
        if (githubUser.username !== username) {
          throw new Error("GitHub token does not match the provided username");
        }
      } catch (error) {
        console.error('GitHub token validation error:', error);
        return res.status(401).json({
          error: "Invalid GitHub token",
          details: "Please reconnect your GitHub account"
        });
      }

      // Create or update the GitHub repository
      const { repoUrl, wasCreated } = await createPortfolioRepository(githubToken, username, repoName);

      // Commit portfolio files
      await commitPortfolioFiles(githubToken, username, [
        {
          path: "index.html",
          content: html
        }
      ], repoName);

      // First, get or create the Vercel project
      const getProjectResponse = await fetch(`https://api.vercel.com/v9/projects/${repoName}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          ...(teamId ? { "X-Vercel-Team-Id": teamId } : {})
        }
      });

      let projectData;
      if (!getProjectResponse.ok) {
        // Project doesn't exist, create it
        const createProjectResponse = await fetch("https://api.vercel.com/v9/projects", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            ...(teamId ? { "X-Vercel-Team-Id": teamId } : {})
          },
          body: JSON.stringify({
            name: repoName,
            gitRepository: {
              repo: `${username}/${repoName}`,
              type: "github",
            },
            framework: null,
            buildCommand: null,
            outputDirectory: ".",
          })
        });

        if (!createProjectResponse.ok) {
          const error = await createProjectResponse.json();
          throw new Error(`Vercel Project error: ${error.error?.message || 'Unknown error'}`);
        }
        projectData = await createProjectResponse.json();
      } else {
        projectData = await getProjectResponse.json();
      }

      // Attempt to get connected repositories for this project
      let connectedRepoId;
      try {
        const reposResponse = await fetch(`https://api.vercel.com/v1/projects/${repoName}/connected-repositories`, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            ...(teamId ? { "X-Vercel-Team-Id": teamId } : {})
          }
        });

        if (reposResponse.ok) {
          const reposData = await reposResponse.json();
          const connectedRepo = reposData.repositories?.find(
            (repo: any) => repo.url === `https://github.com/${username}/${repoName}`
          );

          if (connectedRepo?.id) {
            // Use the found repository ID
            connectedRepoId = connectedRepo.id;
          }
        }
      } catch (error) {
        console.warn('Error getting connected repositories:', error);
        // We'll continue with the fallback approach
      }

      // If we couldn't get the ID from Vercel, use a direct repository ID
      if (!connectedRepoId) {
        try {
          // Use the GitHub token to get repo information
          const githubResponse = await fetch(`https://api.github.com/repos/${username}/${repoName}`, {
            headers: {
              "Authorization": `token ${githubToken}`,
              "Accept": "application/vnd.github.v3+json"
            }
          });
          
          if (githubResponse.ok) {
            const repoData = await githubResponse.json();
            connectedRepoId = repoData.id.toString(); // Convert to string as Vercel might expect string IDs
          } else {
            // If GitHub API fails, use a fallback ID based on username and repo name
            // This is a last resort but better than failing completely
            connectedRepoId = `github-${username}-${repoName}`;
          }
        } catch (githubError) {
          console.error('Failed to get repository from GitHub:', githubError);
          // Use a fallback ID as a last resort
          connectedRepoId = `github-${username}-${repoName}`;
        }
      }

      // Trigger a new deployment with the repository ID
      const deploymentResponse = await fetch("https://api.vercel.com/v13/deployments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(teamId ? { "X-Vercel-Team-Id": teamId } : {})
        },
        body: JSON.stringify({
          name: repoName,
          project: repoName,
          gitSource: {
            type: "github",
            repo: `${username}/${repoName}`,
            ref: "main",
            repoId: connectedRepoId
          }
        })
      });

      if (!deploymentResponse.ok) {
        const error = await deploymentResponse.json();
        throw new Error(`Vercel Deployment error: ${error.error?.message || 'Unknown error'}`);
      }

      const deploymentData = await deploymentResponse.json();

      res.json({
        projectId: repoName,
        deploymentId: deploymentData.id,
        url: `https://${repoName}.vercel.app`,
        repoUrl
      });
    } catch (error) {
      console.error('Failed to deploy to Vercel:', error);
      res.status(500).json({
        error: "Failed to deploy to Vercel",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/deploy/vercel/status/:deploymentId", async (req, res) => {
    const { deploymentId } = req.params;
    const { accessToken } = req.query;

    if (!accessToken) {
      return res.status(400).json({ error: "Vercel access token is required" });
    }

    try {
      const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        }
      });

      const statusData = await statusResponse.json();

      if (statusData.error) {
        throw new Error(`Vercel Status error: ${statusData.error.message || 'Unknown error'}`);
      }

      res.json({
        ready: statusData.ready,
        state: statusData.state,
        url: statusData.url
      });
    } catch (error) {
      console.error('Failed to check Vercel deployment status:', error);
      res.status(500).json({
        error: "Failed to check deployment status",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/deploy/vercel/callback", async (req, res) => {
    const { code, configurationId, next, teamId } = req.query;

    if (!code || !configurationId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    try {
      // Exchange the configuration code for an access token
      const params = new URLSearchParams();
      params.append('client_id', process.env.VERCEL_CLIENT_ID!);
      params.append('client_secret', process.env.VERCEL_CLIENT_SECRET!);
      params.append('code', code as string);
      params.append('redirect_uri', `${process.env.APP_URL}/api/deploy/vercel/callback`);

      const tokenResponse = await fetch("https://api.vercel.com/v2/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString()
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(`Vercel OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      // Return success page with script to send token back to main window
      res.send(`
        <!DOCTYPE html>
        <html>
        <body>
          <script>
            window.opener.postMessage(
              { 
                type: 'vercel-oauth-success', 
                token: '${tokenData.access_token}', 
                teamId: '${teamId || ''}',
                configurationId: '${configurationId}'
              },
              window.location.origin
            );
            window.close();
          </script>
          <p>Authorization successful! You can close this window.</p>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Vercel integration callback error:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <body>
          <script>
            window.opener.postMessage(
              { type: 'vercel-oauth-error', error: '${error instanceof Error ? error.message : 'Unknown error'}' },
              window.location.origin
            );
            window.close();
          </script>
          <p>Authorization failed. You can close this window.</p>
        </body>
        </html>
      `);
    }
  });

  // Helper function to generate portfolio HTML
  function generatePortfolioHtml(
    username: string,
    repositories: Repository[],
    introduction?: {
      introduction: string;
      skills: string[];
      interests: string[];
    },
    avatarUrl?: string | null,
    theme: {
      id: string;
      preview: {
        background: string;
        text: string;
        accent: string;
        card: string;
        border: string;
      };
      layout: {
        container: string;
        header: string;
        content: string;
        profile: string;
      };
    } = themes[1] // Default to modern theme
  ): string {
    if (!repositories || repositories.length === 0) {
      throw new Error("No repositories provided for portfolio generation");
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${username}'s Portfolio</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
    /* Define gradient backgrounds for themes */
    .bg-gradient-to-br.from-indigo-50.via-white.to-purple-50 {
      background: linear-gradient(to bottom right, #eef2ff, #ffffff, #faf5ff);
    }
    .bg-gradient-to-r.from-indigo-500.to-purple-500 {
      background: linear-gradient(to right, #6366f1, #a855f7);
      color: white; /* Ensure text is white on gradient background */
    }
    /* Shadow styling for cards */
    .card-shadow {
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      transition: box-shadow 0.3s ease, transform 0.3s ease;
    }
    .card-shadow:hover {
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }
    /* Button styling */
    .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }
    .icon-button:hover {
      opacity: 0.8;
    }
    </style>
</head>
<body class="${theme.preview.background}">
    <div class="container mx-auto px-4 py-20">
        <div class="${theme.layout.container}">
            <header class="${theme.layout.header}">
                <div class="${theme.layout.profile}">
                    ${avatarUrl ? `
                    <div class="mb-6">
                        <img src="${avatarUrl}" alt="${username}" class="w-32 h-32 rounded-full mx-auto border-4 border-gray-200 shadow-lg">
                    </div>
                    ` : ''}
                    <h1 class="text-4xl font-bold mb-6 ${theme.preview.text}">${username}'s Portfolio</h1>
                    ${introduction ? `
                    <div class="max-w-2xl ${theme.id === 'modern' ? 'text-center' : 'text-left'}">
                        <p class="${theme.preview.text} mb-8 leading-relaxed">${introduction.introduction}</p>
                        <div class="flex flex-wrap gap-3 ${theme.id === 'modern' ? 'justify-center' : ''} mb-8">
                            ${introduction.skills.map(skill => {
                              // For Modern theme with gradient background, use explicit classes
                              return theme.id === 'modern' 
                                ? `<span class="px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white">${skill}</span>`
                                : `<span class="${theme.preview.accent} px-3 py-1 rounded-full text-sm font-medium">${skill}</span>`;
                            }).join('')}
                        </div>
                        <p class="${theme.preview.text} text-sm mb-8">
                            <span class="font-medium">Interests:</span> ${introduction.interests.join(', ')}
                        </p>
                    </div>
                    ` : ''}
                </div>
            </header>

            <div class="${theme.layout.content}">
                ${repositories.map(repo => {
                  if (!repo || typeof repo !== 'object') {
                    console.error('Invalid repository object:', repo);
                    return '';
                  }

                  const topics = Array.isArray(repo.metadata?.topics) ? repo.metadata.topics : [];
                  const description = repo.summary || repo.description || '';
                  
                  // Add margin-bottom for Minimal theme to match the spacing in the preview
                  const marginClass = theme.id === 'minimal' ? 'mb-6' : '';

                  return `
                    <article class="${theme.preview.card} p-6 relative card-shadow ${marginClass}">
                        <div class="flex justify-between items-start">
                            <h2 class="text-2xl font-semibold mb-2 ${theme.preview.text}">${repo.displayName || repo.name || 'Untitled Project'}</h2>
                            <div class="flex items-center gap-2">
                                ${repo.metadata?.stars > 0 ? `
                                <span class="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full flex items-center">
                                    ★ ${repo.metadata.stars}
                                </span>
                                ` : ''}
                                <a href="${repo.url}" class="icon-button border border-gray-200 bg-white" target="_blank" title="View on GitHub">
                                    <i class="fab fa-github"></i>
                                </a>
                                ${repo.metadata?.url ?
                                    `<a href="${repo.metadata.url}" class="icon-button border border-gray-200 bg-white" target="_blank" title="View Live Demo">
                                        <i class="fas fa-external-link-alt"></i>
                                    </a>`
                                    : ''}
                            </div>
                        </div>
                        <p class="${theme.preview.text} mb-4">${description}</p>
                        <div class="flex gap-2 flex-wrap">
                            ${topics.map(topic => {
                                return theme.id === 'modern' 
                                    ? `<span class="px-2 py-1 rounded-full text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white">${topic}</span>`
                                    : `<span class="${theme.preview.accent} px-2 py-1 rounded-full text-sm">${topic}</span>`;
                            }).join('')}
                        </div>
                    </article>
                  `;
                }).join('')}
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  return httpServer;
}