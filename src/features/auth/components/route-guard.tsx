/**
 * @file src/features/auth/components/route-guard.tsx
 * @description Centralized client-side route protection guard.
 * Validates authentication status, enforces role boundaries (Citizen, Officer, Admin),
 * and handles onboarding completion states. Shows an animated loading screen while recovering sessions.
 */

"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: ("citizen" | "officer" | "admin")[];
  requireAuth?: boolean;
}

export function RouteGuard({
  children,
  allowedRoles,
  requireAuth = true,
}: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { firebaseUser, profile, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (loading) return;

    const defaultRoleRedirect = (role?: string) => {
      switch (role) {
        case "admin":
          return "/admin";
        case "officer":
          return "/officer";
        default:
          return "/dashboard";
      }
    };

    if (requireAuth) {
      // 1. User must be logged in
      if (!isAuthenticated || !firebaseUser) {
        router.replace("/login");
        return;
      }

      // Wait until profile is loaded
      if (!profile) return;

      // 2. Complete profile first if incomplete (unless already on complete-profile page)
      if (!profile.isProfileComplete && pathname !== "/complete-profile") {
        router.replace("/complete-profile");
        return;
      }

      // 3. Prevent accessing complete-profile page if it's already done
      if (profile.isProfileComplete && pathname === "/complete-profile") {
        router.replace(defaultRoleRedirect(profile.role));
        return;
      }

      // 4. Role-based routing authorization check
      if (allowedRoles && !allowedRoles.includes(profile.role)) {
        router.replace(defaultRoleRedirect(profile.role));
        return;
      }
    } else {
      // Guest-only routes (e.g. /login, /register)
      if (isAuthenticated && firebaseUser) {
        if (!profile) return;

        if (!profile.isProfileComplete) {
          router.replace("/complete-profile");
        } else {
          router.replace(defaultRoleRedirect(profile.role));
        }
      }
    }
  }, [isAuthenticated, firebaseUser, profile, loading, requireAuth, allowedRoles, pathname, router]);

  const isAuthorized = !requireAuth || !allowedRoles || (profile && allowedRoles.includes(profile.role));

  // Render a professional brand loader while state loads or transitions occur
  if (
    loading || 
    (requireAuth && (!isAuthenticated || !profile || !isAuthorized)) || 
    (!requireAuth && isAuthenticated)
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          {/* Logo or Brand */}
          <span className="text-xl font-bold tracking-tight text-primary animate-pulse">
            CivicMind
          </span>
          {/* Spinner */}
          <div className="relative flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <span className="text-xs text-muted-foreground font-medium select-none tracking-wide">
            Restoring secure session...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default RouteGuard;
