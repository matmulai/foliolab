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
    console.log('Fetching data for queryKey:', queryKey); // Debug log

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log('Received data for queryKey:', queryKey, data); // Debug log
    return data;
  };

// Create and export the queryClient with debug logging and persistence
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      // Enable refetch on window focus to get fresh data when user returns
      refetchOnWindowFocus: true,
      // Set a short stale time to ensure frequent refreshes
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 60, // Keep unused data for 1 hour
      retry: false,
      // Add debug logging for cache operations
      onSuccess: (data, variables, context) => {
        console.log('Query Cache Update:', {
          data,
          variables,
          context,
          timestamp: new Date().toISOString()
        });
      },
      onError: (error, variables, context) => {
        console.error('Query Cache Error:', {
          error,
          variables,
          context,
          timestamp: new Date().toISOString()
        });
      }
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

// Set up visibility change handler to invalidate cache when user returns
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('App visibility changed to visible, invalidating queries');
      // Invalidate all queries when user returns to the app
      queryClient.invalidateQueries();
    }
  });
}

// Set up cache persistence
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
});

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: 1000 * 60 * 60, // 1 hour
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

// Force refresh repositories
export function forceRefreshRepositories() {
  console.log('Forcing repository data refresh');
  return queryClient.invalidateQueries({ queryKey: ['/api/repositories'] });
}