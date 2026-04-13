import axios from 'axios';
import { GitLabRepository } from '../../shared/schema';

const GITLAB_API_URL = 'https://gitlab.com/api/v4';

interface GitLabProject {
  id: number;
  name: string;
  description: string | null;
  web_url: string;
  star_count: number;
  default_branch: string;
  topics: string[];
  last_activity_at: string;
  namespace: {
    id: number;
    name: string;
    path: string;
    kind: string;
    avatar_url: string | null;
  };
  owner?: {
    id: number;
    username: string;
    name: string;
    avatar_url: string | null;
  };
  avatar_url: string | null;
}

interface GitLabUser {
  id: number;
  username: string;
  name: string;
  avatar_url: string | null;
  web_url: string;
}

/**
 * Fetches GitLab user information
 * Privacy: Uses user-provided token, no backend logging
 * @param accessToken - GitLab personal access token
 * @returns User information
 */
export async function getGitLabUser(accessToken: string): Promise<GitLabUser> {
  try {
    const response = await axios.get<GitLabUser>(`${GITLAB_API_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch GitLab user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetches user's GitLab projects (repositories)
 * Privacy: Data fetched directly from GitLab API, processed in-memory only
 * @param accessToken - GitLab personal access token
 * @param username - GitLab username
 * @returns Array of GitLab projects
 */
export async function getGitLabProjects(
  accessToken: string,
  username?: string
): Promise<GitLabRepository[]> {
  try {
    let projects: GitLabProject[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    // Fetch user projects
    while (hasMore) {
      const response = await axios.get<GitLabProject[]>(`${GITLAB_API_URL}/users/${username}/projects`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          per_page: perPage,
          page,
          owned: true,
          membership: true
        }
      });

      if (response.data.length === 0) {
        hasMore = false;
      } else {
        projects = projects.concat(response.data);
        page++;
      }

      // Safety limit to avoid infinite loops
      if (page > 10) break;
    }

    // Convert to our schema format
    return projects.map(project => convertGitLabProjectToRepository(project));
  } catch (error) {
    throw new Error(`Failed to fetch GitLab projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetches README content from a GitLab project
 * Privacy: No logging of README contents
 * @param projectId - GitLab project ID
 * @param accessToken - GitLab personal access token
 * @returns README content or null
 */
export async function getGitLabReadme(
  projectId: number,
  accessToken: string
): Promise<string | null> {
  try {
    const readmeFiles = ['README.md', 'readme.md', 'Readme.md', 'README', 'readme'];

    for (const filename of readmeFiles) {
      try {
        const response = await axios.get(
          `${GITLAB_API_URL}/projects/${projectId}/repository/files/${encodeURIComponent(filename)}/raw`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            params: {
              ref: 'main'
            }
          }
        );

        if (response.data) {
          return response.data;
        }
      } catch (err) {
        // Try next filename
        continue;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts title from README content (first heading)
 * @param readme - README markdown content
 * @returns Extracted title or null
 */
export function extractTitleFromReadme(readme: string | null): string | null {
  if (!readme) return null;

  const lines = readme.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for ATX-style H1 (# Title)
    const atxMatch = line.match(/^\s*#(?![#])\s*(.+)/);
    if (atxMatch) {
      return atxMatch[1].trim();
    }

    // Check for Setext-style H1 (Title\n=====)
    if (i < lines.length - 1) {
      const nextLine = lines[i + 1];
      if (nextLine.trim().match(/^={3,}$/) && line.trim() !== '') {
        return line.trim();
      }
    }
  }

  return null;
}

/**
 * Converts GitLab project to our GitLabRepository schema
 * @param project - GitLab project object
 * @returns GitLabRepository object
 */
function convertGitLabProjectToRepository(project: GitLabProject): GitLabRepository {
  const owner = project.owner || {
    id: project.namespace.id,
    username: project.namespace.path,
    name: project.namespace.name,
    avatar_url: project.namespace.avatar_url
  };

  return {
    id: project.id,
    name: project.name,
    displayName: null, // Will be fetched from README if needed
    description: project.description,
    url: project.web_url,
    summary: null,
    selected: false,
    source: 'gitlab',
    owner: {
      login: owner.username,
      type: project.namespace.kind === 'group' ? 'Organization' : 'User',
      avatarUrl: owner.avatar_url
    },
    metadata: {
      id: project.id,
      stars: project.star_count,
      language: null, // GitLab API v4 doesn't return language directly
      topics: project.topics,
      updatedAt: project.last_activity_at,
      url: project.web_url
    }
  };
}

/**
 * Fetches GitLab projects with README titles
 * Privacy: All processing in-memory, no data stored
 * @param accessToken - GitLab personal access token
 * @param username - GitLab username
 * @returns Array of GitLabRepository with display names
 */
export async function getGitLabProjectsWithTitles(
  accessToken: string,
  username?: string
): Promise<GitLabRepository[]> {
  const projects = await getGitLabProjects(accessToken, username);

  // Fetch README for each project (with delay to avoid rate limits)
  const projectsWithTitles = await Promise.all(
    projects.map(async (project, index) => {
      // Add delay to avoid rate limiting
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const readme = await getGitLabReadme(project.id, accessToken);
      const displayName = extractTitleFromReadme(readme);

      return {
        ...project,
        displayName
      };
    })
  );

  return projectsWithTitles;
}
