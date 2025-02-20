import { Octokit } from "@octokit/rest";

interface GithubUser {
  githubId: string;
  username: string;
  avatarUrl: string | null;
}

interface Repository {
  id: number; // Added ID field to match GitHub API response
  name: string;
  description: string | null;
  url: string;
  metadata: {
    id: number; // Added ID field in metadata
    stars: number;
    language: string | null;
    topics: string[];
    updatedAt: string;
    url?: string | null;
  };
}

export async function getGithubUser(accessToken: string): Promise<GithubUser> {
  const octokit = new Octokit({ auth: accessToken });
  const { data } = await octokit.users.getAuthenticated();
  return {
    githubId: data.id.toString(),
    username: data.login,
    avatarUrl: data.avatar_url || null,
  };
}

export async function checkRepositoryExists(
  accessToken: string,
  username: string,
  repoName: string,
): Promise<boolean> {
  const octokit = new Octokit({ auth: accessToken });
  try {
    await octokit.repos.get({
      owner: username,
      repo: repoName,
    });
    return true;
  } catch (error) {
    if ((error as any).status === 404) {
      return false;
    }
    throw error;
  }
}

export async function getRepositories(
  accessToken: string,
): Promise<Repository[]> {
  const octokit = new Octokit({ auth: accessToken });
  const { data } = await octokit.repos.listForAuthenticatedUser({
    visibility: "public",
    sort: "updated",
    per_page: 100,
  });

  // Filter out the foliolab-vercel repository
  const filteredRepos = data.filter((repo) => repo.name !== "foliolab-vercel");

  return filteredRepos.map((repo) => ({
    id: repo.id, // Include the GitHub repository ID
    name: repo.name,
    description: repo.description || null,
    url: repo.html_url,
    metadata: {
      id: repo.id, // Include the ID in metadata as well
      stars: repo.stargazers_count,
      language: repo.language,
      topics: repo.topics || [],
      updatedAt: repo.updated_at,
      url: repo.homepage || null,
    },
  }));
}

export async function createPortfolioRepository(
  accessToken: string,
  username: string,
): Promise<{ repoUrl: string; wasCreated: boolean }> {
  const octokit = new Octokit({ auth: accessToken });
  const repoName = "foliolab-vercel";

  try {
    // Check if repository exists
    const exists = await checkRepositoryExists(accessToken, username, repoName);

    if (!exists) {
      // Create a new repository if it doesn't exist
      const { data: repo } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: "My automatically generated portfolio showcase",
        private: false,
        auto_init: true,
      });

      return { repoUrl: repo.html_url, wasCreated: true };
    } else {
      // Repository already exists, return its URL
      const { data: repo } = await octokit.repos.get({
        owner: username,
        repo: repoName,
      });

      return { repoUrl: repo.html_url, wasCreated: false };
    }
  } catch (error) {
    console.error("Failed to handle portfolio repository:", error);
    throw error;
  }
}

export async function getReadmeContent(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<string | null> {
  const octokit = new Octokit({ auth: accessToken });
  try {
    const { data } = await octokit.repos.getReadme({
      owner,
      repo,
      mediaType: { format: "raw" },
    });
    return data.toString();
  } catch (error) {
    console.warn(`Failed to fetch README for ${owner}/${repo}:`, error);
    return null;
  }
}

export async function commitPortfolioFiles(
  accessToken: string,
  username: string,
  files: Array<{ path: string; content: string }>,
): Promise<void> {
  const octokit = new Octokit({ auth: accessToken });
  const repoName = "foliolab-vercel";

  try {
    // Get the default branch reference
    const { data: ref } = await octokit.git.getRef({
      owner: username,
      repo: repoName,
      ref: "heads/main",
    });

    // Create a new tree with the files
    const { data: tree } = await octokit.git.createTree({
      owner: username,
      repo: repoName,
      base_tree: ref.object.sha,
      tree: files.map((file) => ({
        path: file.path,
        mode: "100644",
        type: "blob",
        content: file.content,
      })),
    });

    // Create a commit
    const { data: commit } = await octokit.git.createCommit({
      owner: username,
      repo: repoName,
      message: "Update portfolio site",
      tree: tree.sha,
      parents: [ref.object.sha],
    });

    // Update the reference
    await octokit.git.updateRef({
      owner: username,
      repo: repoName,
      ref: "heads/main",
      sha: commit.sha,
    });
  } catch (error) {
    console.error("Failed to commit portfolio files:", error);
    throw error;
  }
}

export async function deployToGitHubPages(
  accessToken: string,
  username: string,
  html: string,
): Promise<{ url: string; wasCreated: boolean }> {
  const octokit = new Octokit({ auth: accessToken });
  const repoName = `${username}.github.io`;

  try {
    // Check if the GitHub Pages repository exists
    const exists = await checkRepositoryExists(accessToken, username, repoName);
    let wasCreated = false;

    if (!exists) {
      // Create the GitHub Pages repository if it doesn't exist
      await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: "My GitHub Pages website",
        private: false,
        auto_init: true,
      });
      wasCreated = true;
    }

    // Get the default branch reference
    const { data: ref } = await octokit.git.getRef({
      owner: username,
      repo: repoName,
      ref: "heads/main",
    });

    // Create a new tree with the portfolio.html
    const { data: tree } = await octokit.git.createTree({
      owner: username,
      repo: repoName,
      base_tree: ref.object.sha,
      tree: [
        {
          path: "portfolio.html",
          mode: "100644",
          type: "blob",
          content: html,
        },
      ],
    });

    // Create a commit
    const { data: commit } = await octokit.git.createCommit({
      owner: username,
      repo: repoName,
      message: wasCreated
        ? "Initial portfolio commit"
        : "Update portfolio page",
      tree: tree.sha,
      parents: [ref.object.sha],
    });

    // Update the reference
    await octokit.git.updateRef({
      owner: username,
      repo: repoName,
      ref: "heads/main",
      sha: commit.sha,
    });

    return {
      url: `https://${username}.github.io/portfolio.html`,
      wasCreated,
    };
  } catch (error) {
    console.error("Failed to deploy to GitHub Pages:", error);
    throw error;
  }
}
