import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { getGitHubToken, removeGitHubToken } from './storage';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // Add GitHub token if available
  const githubToken = getGitHubToken();
  if (githubToken) {
    headers["Authorization"] = `Bearer ${githubToken}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};

    // Add GitHub token if available
    const githubToken = getGitHubToken();
    if (githubToken) {
      headers["Authorization"] = `Bearer ${githubToken}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      // Only refetch on window focus for live updates
      refetchOnWindowFocus: true,
      // No stale time - data is valid until cleared
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Set up cache persistence with localStorage
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'PORTFOLIO_QUERY_CACHE', // Specific key for our app
  throttleTime: 1000, // Save to storage at most once per second
  serialize: (data) => JSON.stringify(data),
  deserialize: (data) => JSON.parse(data),
});

// Configure cache persistence
persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  // Cache persists until explicitly cleared
  maxAge: Infinity,
  buster: 'v1', // Cache version, increment when structure changes
  dehydrateOptions: {
    shouldDehydrateQuery: ({ queryKey }) => {
      // Only persist repository data
      return queryKey[0] === '/api/repositories';
    },
  },
});

// Helper to clear cache (useful for debugging)
export function clearQueryCache() {
  queryClient.clear();
  console.log('Query cache cleared');
}

// Force refresh repositories only when explicitly needed
export function forceRefreshRepositories() {
  console.log('Forcing repository data refresh');
  return queryClient.invalidateQueries({ queryKey: ['/api/repositories'] });
}

// Clear all data when returning to home
export function clearAllData() {
  removeGitHubToken();
  localStorage.removeItem("github_username");
  queryClient.clear();
}