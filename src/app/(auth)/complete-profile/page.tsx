/**
 * @file src/app/(auth)/complete-profile/page.tsx
 * @description Complete profile onboarding page.
 * Renders the CompleteProfileForm.
 */

import { CompleteProfileForm } from "@/features/auth/components/complete-profile-form";

export const dynamic = "force-dynamic";

export default function CompleteProfilePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Branding header */}
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <span className="text-xl font-bold tracking-tight text-primary">
            CivicMind
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Complete your profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Tell us who you are to customize your dashboard experience.
          </p>
        </div>

        <CompleteProfileForm />
      </div>
    </div>
  );
}
