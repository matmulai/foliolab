import { User, Repository } from "@shared/schema";

const STORAGE_KEYS = {
  USER: "foliolab_user",
  REPOSITORIES: "foliolab_repositories",
  GITHUB_TOKEN: "foliolab_github_token"
} as const;

export function saveGitHubToken(token: string) {
  localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, token);
}

export function getGitHubToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN);
}

export function removeGitHubToken() {
  localStorage.removeItem(STORAGE_KEYS.GITHUB_TOKEN);
}

export function saveUser(user: User) {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function getUser(): User | null {
  const data = localStorage.getItem(STORAGE_KEYS.USER);
  return data ? JSON.parse(data) : null;
}

export function removeUser() {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

export function saveRepositories(repositories: Repository[]) {
  try {
    console.log('Saving repositories to storage:', repositories.length);
    const existingRepos = getRepositories();
    console.log('Existing repos in storage:', existingRepos.length);

    const updatedRepos = repositories.map(repo => {
      // Check if the repo already has a selection state
      if ('selected' in repo) {
        return repo;
      }

      // Look for existing selection state
      const existing = existingRepos.find(r => r.id === repo.id);
      return {
        ...repo,
        selected: existing ? existing.selected : false
      };
    });

    localStorage.setItem(STORAGE_KEYS.REPOSITORIES, JSON.stringify(updatedRepos));
    console.log('Successfully saved repositories to storage');

    // Verify the save worked
    const savedRepos = getRepositories();
    console.log('Verified saved repos count:', savedRepos.length);
  } catch (error) {
    console.error('Error saving repositories to storage:', error);
    throw error;
  }
}

export function getRepositories(): Repository[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REPOSITORIES);
    if (!data) {
      console.log('No repositories found in storage');
      return [];
    }
    const repos = JSON.parse(data);
    console.log('Retrieved repositories from storage:', repos.length);
    return repos;
  } catch (error) {
    console.error('Error reading repositories from storage:', error);
    return [];
  }
}

export function updateRepository(repository: Repository) {
  const repositories = getRepositories();
  const index = repositories.findIndex(r => r.id === repository.id);
  if (index !== -1) {
    repositories[index] = {
      ...repositories[index],
      ...repository,
      selected: repository.selected ?? repositories[index].selected // Preserve selection state
    };
    saveRepositories(repositories);
  }
}

export function toggleRepositorySelection(id: number): Repository | null {
  console.log('Toggling selection for repository:', id);
  const repositories = getRepositories();
  console.log('Found repositories in storage:', repositories.length);

  const index = repositories.findIndex(r => r.id === id);
  if (index === -1) {
    console.log('Repository not found in storage:', id);
    return null;
  }

  const updatedRepo = {
    ...repositories[index],
    selected: !repositories[index].selected
  };
  console.log('Updating repository selection:', { 
    id: updatedRepo.id,
    selected: updatedRepo.selected 
  });

  // Update the repository in the array
  repositories[index] = updatedRepo;

  // Save the entire array back to storage
  localStorage.setItem(STORAGE_KEYS.REPOSITORIES, JSON.stringify(repositories));

  return updatedRepo;
}

export function clearStorage() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}