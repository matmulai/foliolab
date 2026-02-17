import express from 'express';
import { getBlogPostsFromRSS } from '../lib/rss.js';
import { getMediumPosts, validateMediumUsername } from '../lib/medium.js';
import { getGitLabProjectsWithTitles, getGitLabUser } from '../lib/gitlab.js';
import { getBitbucketRepositoriesWithTitles, validateBitbucketCredentials } from '../lib/bitbucket.js';
import { FreeformContent } from '../../shared/schema';
import crypto from 'crypto';

const router = express.Router();

/**
 * Fetch blog posts from RSS feed
 * POST /api/sources/rss
 * Privacy: No data logging, direct fetch and return
 */
router.post('/rss', async (req, res) => {
  try {
    const { feedUrl, author } = req.body;

    if (!feedUrl) {
      return res.status(400).json({ error: 'Feed URL is required' });
    }

    const posts = await getBlogPostsFromRSS(feedUrl, author);
    res.json({ posts });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch RSS feed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Fetch Medium posts by username
 * POST /api/sources/medium
 * Privacy: Uses public RSS feed, no authentication needed
 */
router.post('/medium', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const posts = await getMediumPosts(username);
    res.json({ posts });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch Medium posts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Validate Medium username
 * POST /api/sources/medium/validate
 */
router.post('/medium/validate', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const isValid = await validateMediumUsername(username);
    res.json({ valid: isValid });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to validate Medium username',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Fetch GitLab projects
 * POST /api/sources/gitlab
 * Privacy: Token is not stored, only used for API calls
 */
router.post('/gitlab', async (req, res) => {
  try {
    const { accessToken, username } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    // Fetch user if username not provided
    let gitlabUsername = username;
    if (!gitlabUsername) {
      const user = await getGitLabUser(accessToken);
      gitlabUsername = user.username;
    }

    const projects = await getGitLabProjectsWithTitles(accessToken, gitlabUsername);
    res.json({ projects });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch GitLab projects',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Fetch Bitbucket repositories
 * POST /api/sources/bitbucket
 * Privacy: Credentials are not stored, only used for API calls
 */
router.post('/bitbucket', async (req, res) => {
  try {
    const { username, appPassword } = req.body;

    if (!username || !appPassword) {
      return res.status(400).json({ error: 'Username and app password are required' });
    }

    const repositories = await getBitbucketRepositoriesWithTitles(username, appPassword);
    res.json({ repositories });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch Bitbucket repositories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Validate Bitbucket credentials
 * POST /api/sources/bitbucket/validate
 */
router.post('/bitbucket/validate', async (req, res) => {
  try {
    const { username, appPassword } = req.body;

    if (!username || !appPassword) {
      return res.status(400).json({ error: 'Username and app password are required' });
    }

    const isValid = await validateBitbucketCredentials(username, appPassword);
    res.json({ valid: isValid });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to validate Bitbucket credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create free-form content
 * POST /api/sources/freeform
 * Privacy: Content is created client-side, this endpoint just validates structure
 * Note: This endpoint is mainly for validation; actual storage happens in browser localStorage
 */
router.post('/freeform', async (req, res) => {
  try {
    const { title, content, description, url, contentType, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Create free-form content object
    const freeformContent: FreeformContent = {
      id: crypto.randomBytes(16).toString('hex'),
      title,
      content,
      description: description || null,
      url: url || undefined,
      selected: false,
      source: 'freeform',
      createdAt: new Date().toISOString(),
      contentType: contentType || 'other',
      tags: tags || []
    };

    // Return the validated content (not stored server-side)
    res.json({ content: freeformContent });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create free-form content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate AI summaries for portfolio items
 * POST /api/sources/generate-summaries
 * Privacy: Content is sent to OpenAI but not logged on our backend
 */
router.post('/generate-summaries', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const serverApiKey = process.env.OPENAI_API_KEY;
    if (!serverApiKey) {
      return res.status(500).json({
        error: 'OpenAI API key not configured',
        details: 'OPENAI_API_KEY environment variable is required'
      });
    }

    // Import the generateContentSummary function
    const { generateContentSummary, generateRepoSummary } = await import('../lib/openai.js');
    const { getReadmeContent } = await import('../lib/github.js');

    const summaries: Record<string, string> = {};

    // Generate summaries for each item
    for (const item of items) {
      try {
        let summary = '';

        if (item.source === 'github' || item.source === 'gitlab' || item.source === 'bitbucket') {
          // For repos, use the existing repo summary logic
          // Try to fetch README if we have access token
          let readme = '';
          if (item.source === 'github' && req.headers.authorization) {
            const token = req.headers.authorization.replace('Bearer ', '');
            try {
              readme = (await getReadmeContent(token, item.owner.login, item.name)) || '';
            } catch (e) {
              console.warn(`Could not fetch README for ${item.name}:`, e);
            }
          }

          const result = await generateRepoSummary(
            item.name,
            item.description || '',
            readme,
            serverApiKey,
            undefined,
            item.metadata,
            req.headers.authorization?.replace('Bearer ', ''),
            item.owner?.login
          );
          summary = result.summary;
        } else if (item.source === 'blog_rss') {
          // For blog posts
          const result = await generateContentSummary(
            item.title,
            item.description || '',
            'blog_post',
            serverApiKey,
            {
              author: item.author || undefined,
              publishedAt: item.publishedAt,
              tags: item.tags,
              url: item.url
            }
          );
          summary = result.summary;
        } else if (item.source === 'medium') {
          // For Medium posts
          const result = await generateContentSummary(
            item.title,
            item.description || '',
            'medium_post',
            serverApiKey,
            {
              author: item.author || undefined,
              publishedAt: item.publishedAt,
              tags: item.tags,
              url: item.url
            }
          );
          summary = result.summary;
        } else if (item.source === 'freeform') {
          // For freeform content
          const result = await generateContentSummary(
            item.title,
            item.content,
            'freeform',
            serverApiKey,
            {
              tags: item.tags,
              url: item.url
            }
          );
          summary = result.summary;
        }

        // Store summary with item ID
        const itemId = item.source === 'github' || item.source === 'gitlab' || item.source === 'bitbucket'
          ? item.id
          : item.id;
        summaries[itemId] = summary;
      } catch (itemError) {
        console.error(`Failed to generate summary for item ${item.id}:`, itemError);
        // Continue with other items even if one fails
      }
    }

    res.json({ summaries });
  } catch (error) {
    console.error('Error generating summaries:', error);
    res.status(500).json({
      error: 'Failed to generate summaries',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
