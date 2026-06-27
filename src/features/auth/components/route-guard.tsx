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
  const { firebaseUser, profile, loading, isAuthenticated, logout } = useAuth();

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

      // If profile is loaded but is null (doesn't exist in Firestore database)
      if (!profile) {
        logout().catch((err) => console.error("RouteGuard logout failure:", err));
        router.replace("/register");
        return;
      }

      // Enforce account status check
      if (profile.isActive === false) {
        logout().catch((err) => console.error("RouteGuard active check logout failure:", err));
        router.replace("/login");
        return;
      }

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

      // Strict admin route isolation
      if (profile && profile.role === "admin") {
        const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
        if (!isAdminRoute) {
          router.replace("/admin");
          return;
        }
      }

      // 4. Role-based routing authorization check
      if (allowedRoles && !allowedRoles.includes(profile.role)) {
        router.replace(defaultRoleRedirect(profile.role));
        return;
      }
    } else {
      // Guest-only routes (e.g. /login, /register)
      if (isAuthenticated && firebaseUser) {
        // Only redirect to dashboard if profile is fully complete
        if (profile && profile.isProfileComplete) {
          router.replace(defaultRoleRedirect(profile.role));
        }
      }
    }
  }, [isAuthenticated, firebaseUser, profile, loading, requireAuth, allowedRoles, pathname, router]);

  const isAuthorized = (() => {
    if (!requireAuth) return true;
    if (pathname === "/complete-profile") return true;
    if (!profile) return false;
    if (profile.isActive === false) return false;
    
    // Strict admin route isolation
    if (profile.role === "admin") {
      const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
      if (!isAdminRoute) return false;
    }

    if (allowedRoles && !allowedRoles.includes(profile.role)) return false;
    return true;
  })();

  const shouldShowLoader = (() => {
    if (loading) return true;

    if (requireAuth) {
      if (!isAuthenticated || !firebaseUser) return true;

      // If we are on /complete-profile, we don't need a profile document to exist yet
      if (pathname === "/complete-profile") {
        return false;
      }

      // On other pages, if profile doesn't exist, or is incomplete, or they are not authorized, show loader
      if (!profile || !profile.isProfileComplete || !isAuthorized || profile.isActive === false) return true;
    } else {
      // Guest-only routes (e.g. /login, /register)
      // Show loader if the user is authenticated and has a complete profile (meaning we are about to redirect them away)
      if (isAuthenticated && firebaseUser && profile && profile.isProfileComplete) return true;
    }

    return false;
  })();

  // Render a professional brand loader while state loads or transitions occur
  if (shouldShowLoader) {
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
