/**
 * @file src/config/query.ts
 * @description TanStack Query Client configuration settings.
 * Specifies stale times, garbage collection policies, and retry counts for network requests.
 */

export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes standard stale threshold
      gcTime: 1000 * 60 * 10,    // 10 minutes cache garbage collection
      retry: 1,                 // Retry failing requests once before presenting error state
      refetchOnWindowFocus: false, // Prevent automated refetching when window gains focus
    },
  },
} as const;

export default queryConfig;
