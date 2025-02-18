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
  localStorage.setItem(STORAGE_KEYS.REPOSITORIES, JSON.stringify(repositories));
}

export function getRepositories(): Repository[] {
  const data = localStorage.getItem(STORAGE_KEYS.REPOSITORIES);
  return data ? JSON.parse(data) : [];
}

export function updateRepository(repository: Repository) {
  const repositories = getRepositories();
  const index = repositories.findIndex(r => r.id === repository.id);
  if (index !== -1) {
    repositories[index] = {
      ...repositories[index],
      ...repository
    };
    saveRepositories(repositories);
  }
}

export function toggleRepositorySelection(id: number) {
  const repositories = getRepositories();
  const index = repositories.findIndex(r => r.id === id);
  if (index !== -1) {
    repositories[index] = {
      ...repositories[index],
      selected: !repositories[index].selected
    };
    saveRepositories(repositories);
    return repositories[index];
  }
  return null;
}

export function clearStorage() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}