import axios from 'axios';
import { BitbucketRepository } from '../../shared/schema';

const BITBUCKET_API_URL = 'https://api.bitbucket.org/2.0';

interface BitbucketRepo {
  uuid: string;
  name: string;
  slug: string;
  description: string | null;
  links: {
    html: {
      href: string;
    };
  };
  language: string | null;
  updated_on: string;
  owner: {
    display_name: string;
    username: string;
    type: string;
    links: {
      avatar: {
        href: string;
      };
    };
  };
  workspace: {
    slug: string;
    name: string;
    type: string;
  };
}

interface BitbucketUser {
  uuid: string;
  username: string;
  display_name: string;
  links: {
    avatar: {
      href: string;
    };
  };
}

interface BitbucketPaginatedResponse<T> {
  values: T[];
  next?: string;
  page?: number;
  pagelen?: number;
  size?: number;
}

/**
 * Fetches Bitbucket user information
 * Privacy: Uses user-provided credentials, no backend logging
 * @param username - Bitbucket username (app password authentication)
 * @param appPassword - Bitbucket app password
 * @returns User information
 */
export async function getBitbucketUser(
  username: string,
  appPassword: string
): Promise<BitbucketUser> {
  try {
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    const response = await axios.get<BitbucketUser>(
      `${BITBUCKET_API_URL}/user`,
      {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch Bitbucket user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetches user's Bitbucket repositories
 * Privacy: Data fetched directly from Bitbucket API, processed in-memory only
 * @param username - Bitbucket username
 * @param appPassword - Bitbucket app password
 * @returns Array of Bitbucket repositories
 */
export async function getBitbucketRepositories(
  username: string,
  appPassword: string
): Promise<BitbucketRepository[]> {
  try {
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    let repositories: BitbucketRepo[] = [];
    let nextUrl: string | undefined = `${BITBUCKET_API_URL}/repositories/${username}`;
    let pageCount = 0;

    // Bitbucket uses cursor-based pagination
    while (nextUrl && pageCount < 10) {
      const response: { data: BitbucketPaginatedResponse<BitbucketRepo> } = await axios.get<BitbucketPaginatedResponse<BitbucketRepo>>(
        nextUrl,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          },
          params: {
            pagelen: 100,
            role: 'owner'
          }
        }
      );

      repositories = repositories.concat(response.data.values);
      nextUrl = response.data.next;
      pageCount++;

      // Add delay to avoid rate limiting
      if (nextUrl) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Convert to our schema format
    return repositories.map(repo => convertBitbucketRepoToRepository(repo));
  } catch (error) {
    throw new Error(`Failed to fetch Bitbucket repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetches README content from a Bitbucket repository
 * Privacy: No logging of README contents
 * @param workspace - Bitbucket workspace slug
 * @param repoSlug - Repository slug
 * @param username - Bitbucket username
 * @param appPassword - Bitbucket app password
 * @returns README content or null
 */
export async function getBitbucketReadme(
  workspace: string,
  repoSlug: string,
  username: string,
  appPassword: string
): Promise<string | null> {
  try {
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    const readmeFiles = ['README.md', 'readme.md', 'Readme.md', 'README', 'readme'];

    for (const filename of readmeFiles) {
      try {
        const response = await axios.get<string>(
          `${BITBUCKET_API_URL}/repositories/${workspace}/${repoSlug}/src/main/${filename}`,
          {
            headers: {
              'Authorization': `Basic ${auth}`
            }
          }
        );

        if (response.data) {
          return response.data;
        }
      } catch (err) {
        // Try with master branch
        try {
          const responseMaster = await axios.get<string>(
            `${BITBUCKET_API_URL}/repositories/${workspace}/${repoSlug}/src/master/${filename}`,
            {
              headers: {
                'Authorization': `Basic ${auth}`
              }
            }
          );

          if (responseMaster.data) {
            return responseMaster.data;
          }
        } catch (err2) {
          // Try next filename
          continue;
        }
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
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)/);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Converts Bitbucket repository to our BitbucketRepository schema
 * @param repo - Bitbucket repository object
 * @returns BitbucketRepository object
 */
function convertBitbucketRepoToRepository(repo: BitbucketRepo): BitbucketRepository {
  return {
    id: repo.uuid,
    name: repo.name,
    displayName: null, // Will be fetched from README if needed
    description: repo.description,
    url: repo.links.html.href,
    summary: null,
    selected: false,
    source: 'bitbucket',
    owner: {
      login: repo.owner.username,
      type: repo.owner.type === 'team' ? 'Organization' : 'User',
      avatarUrl: repo.owner.links.avatar.href
    },
    metadata: {
      id: repo.uuid,
      stars: 0, // Bitbucket doesn't have stars
      language: repo.language,
      topics: [], // Bitbucket API v2 doesn't expose topics easily
      updatedAt: repo.updated_on,
      url: repo.links.html.href
    }
  };
}

/**
 * Fetches Bitbucket repositories with README titles
 * Privacy: All processing in-memory, no data stored
 * @param username - Bitbucket username
 * @param appPassword - Bitbucket app password
 * @returns Array of BitbucketRepository with display names
 */
export async function getBitbucketRepositoriesWithTitles(
  username: string,
  appPassword: string
): Promise<BitbucketRepository[]> {
  const repositories = await getBitbucketRepositories(username, appPassword);

  // Fetch README for each repository (with delay to avoid rate limits)
  const repositoriesWithTitles = await Promise.all(
    repositories.map(async (repo, index) => {
      // Add delay to avoid rate limiting
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Extract workspace from URL or use owner login
      const workspace = repo.owner.login;
      const repoSlug = repo.name.toLowerCase().replace(/\s+/g, '-');

      const readme = await getBitbucketReadme(workspace, repoSlug, username, appPassword);
      const displayName = extractTitleFromReadme(readme);

      return {
        ...repo,
        displayName
      };
    })
  );

  return repositoriesWithTitles;
}

/**
 * Validates Bitbucket credentials
 * @param username - Bitbucket username
 * @param appPassword - Bitbucket app password
 * @returns true if credentials are valid
 */
export async function validateBitbucketCredentials(
  username: string,
  appPassword: string
): Promise<boolean> {
  try {
    await getBitbucketUser(username, appPassword);
    return true;
  } catch (error) {
    return false;
  }
}
