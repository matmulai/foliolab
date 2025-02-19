import { Repository } from "@shared/schema";

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

export function saveRepositories(repositories: Repository[]) {
  try {
    console.log('Saving repositories to storage:', repositories.length);
    localStorage.setItem(STORAGE_KEYS.REPOSITORIES, JSON.stringify(repositories));
    console.log('Successfully saved repositories to storage');
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
    const repos = JSON.parse(data) as Repository[];
    console.log('Retrieved repositories from storage:', repos.length);
    return repos;
  } catch (error) {
    console.error('Error reading repositories from storage:', error);
    return [];
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

  repositories[index] = updatedRepo;
  saveRepositories(repositories);

  return updatedRepo;
}

export function clearStorage() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}