import { Router } from 'express';
import { getGithubUser } from '../lib/github.js';
import { generateUserIntroduction } from '../lib/openai.js';

const router = Router();

router.post('/api/user/introduction', async (req, res) => {
  const { repositories } = req.body;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');

  if (!accessToken) {
    return res.status(401).json({ error: 'No access token provided' });
  }

  try {
    const user = await getGithubUser(accessToken);
    const serverApiKey = process.env.OPENAI_API_KEY;
    if (!serverApiKey) {
      return res.status(500).json({
        error: 'OpenAI API key not configured',
        details: 'OPENAI_API_KEY environment variable is required'
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
      error: 'Failed to generate user introduction',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
