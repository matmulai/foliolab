import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

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
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
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
    console.log('Fetching data for queryKey:', queryKey);

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log('Received data for queryKey:', queryKey, data);
    return data;
  };

// Create and export the queryClient with debug logging and persistence
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      // Only refetch on window focus if data is stale
      refetchOnWindowFocus: true,
      // Keep repository data fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60, // Keep unused data for 1 hour
      retry: false,
    },
    mutations: {
      retry: false,
      // Add debug logging for mutation operations
      onMutate: (variables) => {
        console.log('Starting mutation:', {
          variables,
          timestamp: new Date().toISOString()
        });
      },
      onSuccess: (data, variables, context) => {
        console.log('Mutation success:', {
          data,
          variables,
          context,
          timestamp: new Date().toISOString()
        });
      },
      onError: (error, variables, context) => {
        console.error('Mutation error:', {
          error,
          variables,
          context,
          timestamp: new Date().toISOString()
        });
      }
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
  maxAge: 1000 * 60 * 60 * 24, // Cache persists for 24 hours
  buster: 'v1', // Cache version, increment when structure changes
  dehydrateOptions: {
    shouldDehydrateQuery: ({ queryKey }) => {
      // Only persist repository data
      return queryKey[0] === '/api/repositories';
    },
  },
});

// Helper function to inspect cache contents
export function inspectQueryCache() {
  const queries = queryClient.getQueryCache().findAll();
  console.log('Current Query Cache State:', queries.map(query => ({
    queryKey: query.queryKey,
    state: query.state,
    isStale: query.isStale(),
    lastUpdated: query.state.dataUpdatedAt
  })));
}

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