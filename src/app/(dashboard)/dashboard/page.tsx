/**
 * @file src/app/(dashboard)/dashboard/page.tsx
 * @description Citizen Dashboard page.
 * Protected by RouteGuard; displays user profile attributes and sign-out controls.
 */

"use client";

import { useAuth } from "@/providers/auth-provider";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function CitizenDashboardPage() {
  const { profile, logout } = useAuth();

  return (
    <RouteGuard allowedRoles={["citizen"]}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        {/* Navigation Bar */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <span className="font-bold text-primary">CivicMind</span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground font-medium">
                {profile?.email} ({profile?.role})
              </span>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {profile?.displayName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Report local municipal issues or track active resolution processes in your neighborhood.
            </p>
          </div>

          <div className="border border-border rounded-lg p-6 bg-card flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Active Citizen Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Display Name</span>
                <span className="font-medium">{profile?.displayName}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Contact Phone</span>
                <span className="font-medium">{profile?.phoneNumber || "Not provided"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">System Privilege</span>
                <span className="font-medium capitalize">{profile?.role}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Account Created</span>
                <span className="font-medium">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </RouteGuard>
  );
}
