/**
 * @file src/providers/query-provider.tsx
 * @description TanStack Query Client Provider.
 * Wraps client-side components to enable cached queries and mutations across the application context.
 */

"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryConfig } from "@/config/query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Ensure the QueryClient is instantiated once per page lifecycle, preventing resets
  const [queryClient] = useState(() => new QueryClient(queryConfig));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
export default QueryProvider;
