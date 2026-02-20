import { Router } from 'express';
import { getRepositories, getReadmeContent, getGithubUser, extractTitleFromReadme } from '../lib/github.js';
import { generateRepoSummary } from '../lib/openai.js';
import { cleanReadmeContent } from '../lib/readme-cleaner.js';
import { createErrorResponse, ErrorCodes } from '../lib/error-responses.js';

const router = Router();

router.get('/api/repositories', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  if (!accessToken) {
    return res.status(401).json(
      createErrorResponse(
        'No access token provided',
        'Authorization header is missing or invalid',
        ErrorCodes.MISSING_TOKEN
      )
    );
  }

  try {
    const repos = await getRepositories(accessToken);
    res.json({ repositories: repos });
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    res.status(500).json(
      createErrorResponse(
        'Failed to fetch repositories',
        error instanceof Error ? error.message : String(error),
        ErrorCodes.GITHUB_API_ERROR
      )
    );
  }
});

router.post('/api/fetch-repos', async (req, res) => {
  const { code } = req.body;
  
  try {
    if (!code) {
      return res.status(400).json(
        createErrorResponse(
          'Authorization code is required',
          'No authorization code provided in request body',
          ErrorCodes.MISSING_REQUIRED_FIELD
        )
      );
    }

    // Validate environment variables
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      console.error('Missing GitHub OAuth configuration');
      return res.status(500).json(
        createErrorResponse(
          'Server configuration error',
          'GitHub OAuth credentials not properly configured',
          ErrorCodes.INTERNAL_ERROR
        )
      );
    }

    console.log('Exchanging authorization code for access token...');
    
    const params = new URLSearchParams();
    params.append('client_id', process.env.GITHUB_CLIENT_ID);
    params.append('client_secret', process.env.GITHUB_CLIENT_SECRET);
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

    if (!tokenResponse.ok) {
      console.error('GitHub token exchange failed:', tokenResponse.status, tokenResponse.statusText);
      return res.status(500).json({
        error: 'GitHub OAuth error',
        details: `Token exchange failed with status ${tokenResponse.status}`
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange response received');

    // Handle GitHub OAuth errors
    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData.error, tokenData.error_description);
      
      // Provide more specific error messages
      let userMessage = 'GitHub authentication failed';
      if (tokenData.error === 'bad_verification_code') {
        userMessage = 'The authorization code is invalid or has expired. Please try signing in again.';
      } else if (tokenData.error === 'incorrect_client_credentials') {
        userMessage = 'GitHub application credentials are incorrect. Please contact support.';
      } else if (tokenData.error === 'redirect_uri_mismatch') {
        userMessage = 'Redirect URI mismatch. Please contact support.';
      }
      
      return res.status(400).json({
        error: userMessage,
        details: tokenData.error_description || tokenData.error,
        code: tokenData.error
      });
    }

    if (!tokenData.access_token) {
      console.error('No access token in GitHub response:', tokenData);
      return res.status(500).json({
        error: 'GitHub authentication failed',
        details: 'No access token received from GitHub'
      });
    }

    console.log('Access token received, fetching user and repositories...');

    // Fetch user and repositories with the new token
    const [githubUser, repos] = await Promise.all([
      getGithubUser(tokenData.access_token),
      getRepositories(tokenData.access_token)
    ]);

    console.log(`Successfully authenticated user: ${githubUser.username}, found ${repos.length} repositories`);

    res.json({
      repositories: repos,
      accessToken: tokenData.access_token,
      username: githubUser.username
    });
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    
    // Provide more specific error handling
    if (error instanceof Error) {
      if (error.message.includes('GitHub OAuth error')) {
        return res.status(400).json({
          error: 'GitHub authentication failed',
          details: error.message,
          suggestion: 'Please try signing in again. If the problem persists, the authorization code may have expired.'
        });
      }
    }
    
    res.status(500).json({
      error: 'Failed to fetch repositories',
      details: error instanceof Error ? error.message : String(error),
      suggestion: 'Please try again. If the problem persists, try clearing your browser cache and signing in again.'
    });
  }
});

router.post('/api/repositories/:id/analyze', async (req, res) => {
  const { id } = req.params;
  const { accessToken, username } = req.body;
  const repoId = parseInt(id);

  // Validate repository ID is a valid number
  if (isNaN(repoId) || repoId <= 0) {
    return res.status(400).json(
      createErrorResponse(
        'Invalid repository ID',
        'Repository ID must be a valid positive number',
        ErrorCodes.INVALID_INPUT
      )
    );
  }

  if (!accessToken || !username) {
    return res.status(400).json(
      createErrorResponse(
        'Access token and username are required',
        'Missing required fields in request body',
        ErrorCodes.MISSING_REQUIRED_FIELD
      )
    );
  }

  try {
    const repos = await getRepositories(accessToken);
    const repo = repos.find(r => r.id === repoId);

    if (!repo) {
      return res.status(404).json(
        createErrorResponse(
          'Repository not found',
          `No repository found with ID ${repoId}`,
          ErrorCodes.REPO_NOT_FOUND
        )
      );
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
      return res.status(500).json(
        createErrorResponse(
          'OpenAI API key not configured',
          'OPENAI_API_KEY environment variable is required',
          ErrorCodes.OPENAI_API_KEY_MISSING
        )
      );
    }


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

    res.json({
      repository: {
        ...repo,
        summary: summary.summary,
        displayName: displayName || repo.displayName
      }
    });
  } catch (error) {
    console.error('Failed to analyze repository:', error);
    res.status(500).json(
      createErrorResponse(
        'Failed to analyze repository',
        error instanceof Error ? error.message : String(error),
        ErrorCodes.OPENAI_API_ERROR
      )
    );
  }
});

export default router;
