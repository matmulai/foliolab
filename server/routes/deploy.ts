import { Router } from 'express';
import { getGithubUser, createPortfolioRepository, commitPortfolioFiles, deployToGitHubPages } from '../lib/github.js';
import { generateUserIntroduction } from '../lib/openai.js';
import { themes } from '../../shared/themes.js';
import type { Repository } from '../../shared/schema.js';

const router = Router();

router.post('/api/deploy/github', async (req, res) => {
  const { accessToken, downloadOnly, repositories, themeId, userInfo, introduction, customTitle } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'GitHub access token is required' });
  }

  try {
    const user = await getGithubUser(accessToken);
    let userIntroduction = introduction;

    if (!userIntroduction) {
      const serverApiKey = process.env.OPENAI_API_KEY;
      if (!serverApiKey) {
        return res.status(500).json({
          error: 'OpenAI API key not configured',
          details: 'OPENAI_API_KEY environment variable is required'
        });
      }
      userIntroduction = await generateUserIntroduction(repositories, serverApiKey);
    }

    const theme = themes.find(t => t.id === themeId) || themes[1];
    const html = generatePortfolioHtml(user.username, repositories, userIntroduction, user.avatarUrl, theme, customTitle);

    if (downloadOnly) {
      return res.json({ html });
    }

    const { repoUrl, wasCreated } = await createPortfolioRepository(accessToken, user.username);
    await commitPortfolioFiles(accessToken, user.username, [
      {
        path: 'index.html',
        content: html
      }
    ]);

    res.json({
      success: true,
      repoUrl,
      wasCreated,
      message: wasCreated
        ? 'Repository created and portfolio files added successfully'
        : 'Portfolio repository updated successfully'
    });
  } catch (error) {
    console.error('Failed to deploy to GitHub:', error);
    res.status(500).json({
      error: 'Failed to deploy to GitHub',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post('/api/deploy/github-pages', async (req, res) => {
  const { accessToken, repositories, themeId, userInfo, introduction, customTitle } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'GitHub access token is required' });
  }

  if (!Array.isArray(repositories) || repositories.length === 0) {
    return res.status(400).json({ error: 'No repositories provided for deployment' });
  }

  try {
    const user = await getGithubUser(accessToken);

    let userIntroduction = introduction;

    if (!userIntroduction) {
      const serverApiKey = process.env.OPENAI_API_KEY;
      if (!serverApiKey) {
        return res.status(500).json({
          error: 'OpenAI API key not configured',
          details: 'OPENAI_API_KEY environment variable is required'
        });
      }
      userIntroduction = await generateUserIntroduction(repositories, serverApiKey);
    }

    const theme = themes.find(t => t.id === themeId) || themes[1];
    const html = generatePortfolioHtml(user.username, repositories, userIntroduction, user.avatarUrl, theme, customTitle);

    const { url, wasCreated } = await deployToGitHubPages(accessToken, user.username, html);

    res.json({
      success: true,
      url,
      wasCreated,
      message: wasCreated
        ? 'GitHub Pages repository created and portfolio deployed successfully'
        : 'Portfolio deployed to GitHub Pages successfully'
    });
  } catch (error) {
    console.error('Failed to deploy to GitHub Pages:', error);
    res.status(500).json({
      error: 'Failed to deploy to GitHub Pages',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/api/deploy/vercel/config', (req, res) => {
  res.json({
    integrationSlug: 'foliolab',
    redirectUri: `${process.env.APP_URL}/api/deploy/vercel/callback`,
  });
});

router.post('/api/deploy/vercel/auth', async (req, res) => {
  const { code } = req.body;

  try {
    const params = new URLSearchParams();
    params.append('client_id', process.env.VERCEL_CLIENT_ID!);
    params.append('client_secret', process.env.VERCEL_CLIENT_SECRET!);
    params.append('code', code);
    params.append('redirect_uri', `${process.env.APP_URL}/api/deploy/vercel/callback`);

    const tokenResponse = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`Vercel OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    res.json({
      accessToken: tokenData.access_token,
      teamId: tokenData.team_id
    });
  } catch (error) {
    console.error('Vercel OAuth error:', error);
    res.status(500).json({
      error: 'Failed to authenticate with Vercel',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post('/api/deploy/vercel', async (req, res) => {
  const { accessToken, teamId, username, repositories, themeId, introduction, userInfo, customTitle } = req.body;

  if (!accessToken || !username) {
    return res.status(400).json({ error: 'Vercel access token and username are required' });
  }

  try {
    let userAvatar = null as string | null;
    try {
      if (userInfo && userInfo.avatarUrl) {
        userAvatar = userInfo.avatarUrl;
      } else {
        const githubToken = req.headers.authorization?.replace('Bearer ', '');
        if (githubToken) {
          const githubUser = await getGithubUser(githubToken);
          userAvatar = githubUser.avatarUrl;
        }
      }
    } catch (userError) {
      console.warn('Could not fetch user avatar:', userError);
    }

    const theme = themes.find(t => t.id === themeId) || themes[1];
    const html = generatePortfolioHtml(username, repositories, introduction, userAvatar, theme, customTitle);

    const repoName = `${username}-foliolab`;
    const githubToken = req.headers.authorization?.replace('Bearer ', '');

    if (!githubToken) {
      return res.status(401).json({ error: 'GitHub token is required' });
    }

    try {
      const githubUser = await getGithubUser(githubToken);
      if (githubUser.username !== username) {
        throw new Error('GitHub token does not match the provided username');
      }
    } catch (error) {
      console.error('GitHub token validation error:', error);
      return res.status(401).json({
        error: 'Invalid GitHub token',
        details: 'Please reconnect your GitHub account'
      });
    }

    const { repoUrl, wasCreated } = await createPortfolioRepository(githubToken, username, repoName);

    await commitPortfolioFiles(githubToken, username, [
      {
        path: 'index.html',
        content: html
      }
    ], repoName);

    const getProjectResponse = await fetch(`https://api.vercel.com/v9/projects/${repoName}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...(teamId ? { 'X-Vercel-Team-Id': teamId } : {})
      }
    });

    let projectData;
    if (!getProjectResponse.ok) {
      const createProjectResponse = await fetch('https://api.vercel.com/v9/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...(teamId ? { 'X-Vercel-Team-Id': teamId } : {})
        },
        body: JSON.stringify({
          name: repoName,
          gitRepository: {
            repo: `${username}/${repoName}`,
            type: 'github',
          },
          framework: null,
          buildCommand: null,
          outputDirectory: '.',
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

    let connectedRepoId;
    try {
      const reposResponse = await fetch(`https://api.vercel.com/v1/projects/${repoName}/connected-repositories`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...(teamId ? { 'X-Vercel-Team-Id': teamId } : {})
        }
      });

      if (reposResponse.ok) {
        const reposData = await reposResponse.json();
        const connectedRepo = reposData.repositories?.find(
          (repo: any) => repo.url === `https://github.com/${username}/${repoName}`
        );

        if (connectedRepo?.id) {
          connectedRepoId = connectedRepo.id;
        }
      }
    } catch (error) {
      console.warn('Error getting connected repositories:', error);
    }

    if (!connectedRepoId) {
      try {
        const githubResponse = await fetch(`https://api.github.com/repos/${username}/${repoName}`, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (githubResponse.ok) {
          const repoData = await githubResponse.json();
          connectedRepoId = repoData.id.toString();
        } else {
          connectedRepoId = `github-${username}-${repoName}`;
        }
      } catch (githubError) {
        console.error('Failed to get repository from GitHub:', githubError);
        connectedRepoId = `github-${username}-${repoName}`;
      }
    }

    const deploymentResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(teamId ? { 'X-Vercel-Team-Id': teamId } : {})
      },
      body: JSON.stringify({
        name: repoName,
        project: repoName,
        gitSource: {
          type: 'github',
          repo: `${username}/${repoName}`,
          ref: 'main',
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
      error: 'Failed to deploy to Vercel',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/api/deploy/vercel/status/:deploymentId', async (req, res) => {
  const { deploymentId } = req.params;
  const { accessToken } = req.query as { accessToken?: string };

  if (!accessToken) {
    return res.status(400).json({ error: 'Vercel access token is required' });
  }

  try {
    const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
      error: 'Failed to check deployment status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/api/deploy/vercel/callback', async (req, res) => {
  const { code, configurationId, next, teamId } = req.query as Record<string, string>;

  if (!code || !configurationId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', process.env.VERCEL_CLIENT_ID!);
    params.append('client_secret', process.env.VERCEL_CLIENT_SECRET!);
    params.append('code', code as string);
    params.append('redirect_uri', `${process.env.APP_URL}/api/deploy/vercel/callback`);

    const tokenResponse = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`Vercel OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

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

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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
  } = themes[1],
  customTitle?: string | null
): string {
  if (!repositories || repositories.length === 0) {
    throw new Error('No repositories provided for portfolio generation');
  }

  const capitalizedUsername = capitalizeFirstLetter(username);
  const portfolioTitle = customTitle || `${capitalizedUsername}'s Portfolio`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(portfolioTitle)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
    /* Define gradient backgrounds for themes */
    .bg-gradient-to-br.from-indigo-50.via-white.to-purple-50 {
      background: linear-gradient(to bottom right, #eef2ff, #ffffff, #faf5ff);
    }
    .bg-gradient-to-r.from-indigo-500.to-purple-500 {
      background: linear-gradient(to right, #6366f1, #a855f7);
      color: white;
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
                        <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(capitalizeFirstLetter(username))}" class="w-32 h-32 rounded-full mx-auto border-4 border-gray-200 shadow-lg">
                    </div>
                    ` : ''}
                    <h1 class="text-4xl font-bold mb-6 ${theme.preview.text}">${escapeHtml(portfolioTitle)}</h1>
                    ${introduction ? `
                    <div class="max-w-2xl ${theme.id === 'modern' ? 'text-center' : 'text-left'}">
                        <p class="${theme.preview.text} mb-8 leading-relaxed">${escapeHtml(introduction.introduction)}</p>
                        <div class="flex flex-wrap gap-3 ${theme.id === 'modern' ? 'justify-center' : ''} mb-8">
                            ${introduction.skills.map(skill =>
                              theme.id === 'modern'
                                ? `<span class="px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white">${escapeHtml(skill)}</span>`
                                : `<span class="${theme.preview.accent} px-3 py-1 rounded-full text-sm font-medium">${escapeHtml(skill)}</span>`
                            ).join('')}
                        </div>
                        <p class="${theme.preview.text} text-sm mb-8">
                            <span class="font-medium">Interests:</span> ${introduction.interests.map(interest => escapeHtml(interest)).join(', ')}
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

                  const marginClass = theme.id === 'minimal' ? 'mb-6' : '';

                  return `
                    <article class="${theme.preview.card} p-6 relative card-shadow ${marginClass}">
                        <div class="flex justify-between items-start">
                            <h2 class="text-2xl font-semibold mb-2 ${theme.preview.text}">${escapeHtml(repo.displayName || repo.name || 'Untitled Project')}</h2>
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
                        <p class="${theme.preview.text} mb-4">${escapeHtml(description)}</p>
                        <div class="flex gap-2 flex-wrap">
                            ${topics.map(topic =>
                                theme.id === 'modern'
                                    ? `<span class="px-2 py-1 rounded-full text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white">${escapeHtml(topic)}</span>`
                                    : `<span class="${theme.preview.accent} px-2 py-1 rounded-full text-sm">${escapeHtml(topic)}</span>`
                            ).join('')}
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

export default router;
