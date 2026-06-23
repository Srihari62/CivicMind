/**
 * @file src/hooks/use-mounted.ts
 * @description Custom React hook to check client-side mounting status.
 * Prevents hydration mismatches by ensuring client-only components
 * do not render during server-side pre-rendering (SSR).
 */

"use client";

import { useEffect, useState } from "react";

/**
 * Returns true if the component has mounted on the client.
 * @returns Boolean representing component mounting state
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
