/**
 * @file src/lib/query-client.ts
 * @description Global TanStack Query (React Query) Client configuration.
 * Configures performance defaults (caching, stale times, request retry behaviors)
 * for state synchronization.
 */

import { QueryClient } from "@tanstack/react-query";
import { queryConfig } from "@/config/query";

/**
 * Global QueryClient instance with production-grade defaults.
 */
export const queryClient = new QueryClient(queryConfig);
