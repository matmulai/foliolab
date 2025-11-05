import { Repository, PortfolioItem, SourceType, DataSourceConfig } from "@shared/schema";

const STORAGE_KEYS = {
  REPOSITORIES: "foliolab_repositories",
  PORTFOLIO_ITEMS: "foliolab_portfolio_items",
  GITHUB_TOKEN: "foliolab_github_token",
  GITLAB_TOKEN: "foliolab_gitlab_token",
  BITBUCKET_CREDENTIALS: "foliolab_bitbucket_credentials",
  DATA_SOURCES: "foliolab_data_sources"
} as const;

// GitHub Token Management
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

// GitLab Token Management
export function saveGitLabToken(token: string) {
  localStorage.setItem(STORAGE_KEYS.GITLAB_TOKEN, token);
}

export function getGitLabToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.GITLAB_TOKEN);
}

export function removeGitLabToken() {
  localStorage.removeItem(STORAGE_KEYS.GITLAB_TOKEN);
}

// Bitbucket Credentials Management (stored encrypted in browser)
export function saveBitbucketCredentials(username: string, appPassword: string) {
  const credentials = { username, appPassword };
  localStorage.setItem(STORAGE_KEYS.BITBUCKET_CREDENTIALS, JSON.stringify(credentials));
}

export function getBitbucketCredentials(): { username: string; appPassword: string } | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BITBUCKET_CREDENTIALS);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading Bitbucket credentials from storage:', error);
    return null;
  }
}

export function removeBitbucketCredentials() {
  localStorage.removeItem(STORAGE_KEYS.BITBUCKET_CREDENTIALS);
}

// Data Sources Configuration
export function saveDataSourceConfig(config: DataSourceConfig) {
  try {
    const configs = getDataSourceConfigs();
    const index = configs.findIndex(c => c.type === config.type);

    if (index >= 0) {
      configs[index] = config;
    } else {
      configs.push(config);
    }

    localStorage.setItem(STORAGE_KEYS.DATA_SOURCES, JSON.stringify(configs));
  } catch (error) {
    console.error('Error saving data source config:', error);
    throw error;
  }
}

export function getDataSourceConfigs(): DataSourceConfig[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DATA_SOURCES);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data source configs:', error);
    return [];
  }
}

export function getDataSourceConfig(type: SourceType): DataSourceConfig | null {
  const configs = getDataSourceConfigs();
  return configs.find(c => c.type === type) || null;
}

// Legacy Repository Management (backward compatible)
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

// Portfolio Items Management (multi-source support)
export function savePortfolioItems(items: PortfolioItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.PORTFOLIO_ITEMS, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving portfolio items to storage:', error);
    throw error;
  }
}

export function getPortfolioItems(): PortfolioItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PORTFOLIO_ITEMS);
    if (!data) {
      // Migration: If no portfolio items but have repositories, migrate them
      const repos = getRepositories();
      if (repos.length > 0) {
        const items = repos.map(repo => ({
          ...repo,
          source: 'github' as const
        })) as PortfolioItem[];
        savePortfolioItems(items);
        return items;
      }
      return [];
    }
    return JSON.parse(data) as PortfolioItem[];
  } catch (error) {
    console.error('Error reading portfolio items from storage:', error);
    return [];
  }
}

export function addPortfolioItem(item: PortfolioItem) {
  const items = getPortfolioItems();
  items.push(item);
  savePortfolioItems(items);
}

export function addPortfolioItems(newItems: PortfolioItem[]) {
  const items = getPortfolioItems();
  items.push(...newItems);
  savePortfolioItems(items);
}

export function updatePortfolioItem(id: string | number, updates: Partial<PortfolioItem>) {
  const items = getPortfolioItems();
  const index = items.findIndex(item => {
    if (item.source === 'github' || item.source === 'gitlab') {
      return (item as any).id === id;
    }
    return item.id === id;
  });

  if (index === -1) return null;

  const updatedItem = { ...items[index], ...updates };
  items[index] = updatedItem;
  savePortfolioItems(items);

  return updatedItem;
}

export function deletePortfolioItem(id: string | number) {
  const items = getPortfolioItems();
  const filtered = items.filter(item => {
    if (item.source === 'github' || item.source === 'gitlab') {
      return (item as any).id !== id;
    }
    return item.id !== id;
  });
  savePortfolioItems(filtered);
}

export function togglePortfolioItemSelection(id: string | number): PortfolioItem | null {
  const items = getPortfolioItems();
  const index = items.findIndex(item => {
    if (item.source === 'github' || item.source === 'gitlab') {
      return (item as any).id === id;
    }
    return item.id === id;
  });

  if (index === -1) return null;

  const updatedItem = {
    ...items[index],
    selected: !items[index].selected
  };

  items[index] = updatedItem;
  savePortfolioItems(items);

  return updatedItem;
}

export function getPortfolioItemsBySource(source: SourceType): PortfolioItem[] {
  return getPortfolioItems().filter(item => item.source === source);
}

export function clearStorage() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}