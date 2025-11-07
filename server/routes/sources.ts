import express from 'express';
import { getBlogPostsFromRSS } from '../lib/rss';
import { getMediumPosts, validateMediumUsername } from '../lib/medium';
import { getGitLabProjectsWithTitles, getGitLabUser } from '../lib/gitlab';
import { getBitbucketRepositoriesWithTitles, validateBitbucketCredentials } from '../lib/bitbucket';
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
 * Analyze portfolio item with AI (works for any source type)
 * POST /api/sources/analyze/:id
 * Privacy: Content is sent to OpenAI but not logged on our backend
 * Note: This endpoint is simplified - for GitHub repos, use the existing analyze endpoint
 */
router.post('/analyze/:id', async (req, res) => {
  try {
    const { content, type, title } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required for analysis' });
    }

    // For now, return a simple summary without AI
    // This can be enhanced later with OpenAI integration if needed
    let summary = '';

    // Extract first few sentences as a basic summary
    const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    summary = sentences.slice(0, 2).join('. ') + '.';

    // Truncate if too long
    if (summary.length > 200) {
      summary = summary.substring(0, 197) + '...';
    }

    res.json({ summary });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to analyze content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
