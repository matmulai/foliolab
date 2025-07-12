import { Repository } from "@shared/schema";

const STORAGE_KEYS = {
  REPOSITORIES: "foliolab_repositories",
  GITHUB_TOKEN: "foliolab_github_token"
} as const;

export function saveGitHubToken(token: string) {
  localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, token);
}

export function getGitHubToken(): string | null {
  // First try the new key
  let token = localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN);
  
  // If not found, try the old key for backward compatibility
  if (!token) {
    token = localStorage.getItem("github_token");
    
    // If found in old key, migrate it to new key and remove old one
    if (token) {
      localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, token);
      localStorage.removeItem("github_token");
    }
  }
  
  return token;
}

export function removeGitHubToken() {
  // Remove both old and new keys to ensure complete cleanup
  localStorage.removeItem(STORAGE_KEYS.GITHUB_TOKEN);
  localStorage.removeItem("github_token");
}

export function saveRepositories(repositories: Repository[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.REPOSITORIES, JSON.stringify(repositories));
  } catch (error) {
    console.error('Error saving repositories to storage:', error);
    throw error;
  }
}

export function getRepositories(): Repository[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REPOSITORIES);
    if (!data) return [];
    return JSON.parse(data) as Repository[];
  } catch (error) {
    console.error('Error reading repositories from storage:', error);
    return [];
  }
}

export function toggleRepositorySelection(id: number): Repository | null {
  const repositories = getRepositories();
  const index = repositories.findIndex(r => r.id === id);
  if (index === -1) return null;

  const updatedRepo = {
    ...repositories[index],
    selected: !repositories[index].selected
  };

  repositories[index] = updatedRepo;
  saveRepositories(repositories);

  return updatedRepo;
}

export function clearStorage() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}