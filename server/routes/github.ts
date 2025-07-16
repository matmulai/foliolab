import { Router } from 'express';
import { getRepositories, getReadmeContent, getGithubUser, extractTitleFromReadme } from '../lib/github.js';
import { generateRepoSummary } from '../lib/openai.js';
import { cleanReadmeContent } from '../lib/readme-cleaner.js';

const router = Router();

router.get('/api/repositories', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  if (!accessToken) {
    return res.status(401).json({ error: 'No access token provided' });
  }

  try {
    const repos = await getRepositories(accessToken);
    res.json({ repositories: repos });
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    res.status(500).json({
      error: 'Failed to fetch repositories',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post('/api/fetch-repos', async (req, res) => {
  const { code } = req.body;
  try {
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const params = new URLSearchParams();
    params.append('client_id', process.env.GITHUB_CLIENT_ID!);
    params.append('client_secret', process.env.GITHUB_CLIENT_SECRET!);
    params.append('code', code);

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'FolioLab/1.0.0',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: params.toString()
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    if (!tokenData.access_token) {
      throw new Error('No access token in GitHub response');
    }

    const githubUser = await getGithubUser(tokenData.access_token);
    const repos = await getRepositories(tokenData.access_token);

    res.json({
      repositories: repos,
      accessToken: tokenData.access_token,
      username: githubUser.username
    });
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    res.status(500).json({
      error: 'Failed to fetch repositories',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post('/api/repositories/:id/analyze', async (req, res) => {
  const { id } = req.params;
  const { accessToken, username } = req.body;
  const repoId = parseInt(id);

  if (!accessToken || !username) {
    return res.status(400).json({ error: 'Access token and username are required' });
  }

  try {
    const repos = await getRepositories(accessToken);
    const repo = repos.find(r => r.id === repoId);

    if (!repo) {
      return res.status(404).json({
        error: 'Repository not found',
        details: `No repository found with ID ${repoId}`
      });
    }

    let readme = '';
    let displayName = null as string | null;

    try {
      const rawReadme = await getReadmeContent(accessToken, username, repo.name) || '';
      readme = cleanReadmeContent(rawReadme);
      displayName = extractTitleFromReadme(rawReadme);
    } catch (error) {
      console.warn(`Couldn't fetch README for ${repo.name}:`, error);
    }

    const serverApiKey = process.env.OPENAI_API_KEY;

    if (!serverApiKey) {
      return res.status(500).json({
        error: 'OpenAI API key not configured',
        details: 'OPENAI_API_KEY environment variable is required'
      });
    }

    console.log('Starting repository analysis for:', repo.name);
    console.log('Repository metadata:', {
      language: repo.metadata.language,
      topics: repo.metadata.topics,
      stars: repo.metadata.stars,
      hasReadme: !!readme && readme.trim().length > 0
    });

    const summary = await generateRepoSummary(
      repo.name,
      repo.description || '',
      readme,
      serverApiKey,
      undefined,
      {
        language: repo.metadata.language,
        topics: repo.metadata.topics,
        stars: repo.metadata.stars,
        url: repo.metadata.url
      },
      accessToken,
      repo.owner.login
    );

    console.log('Successfully generated summary for:', repo.name);

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
      error: 'Failed to analyze repository',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
