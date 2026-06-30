/**
 * @file src/app/(auth)/complete-profile/page.tsx
 * @description Complete profile onboarding page.
 * Wrapped in RouteGuard to ensure session is authenticated.
 */

import { CompleteProfileForm } from "@/features/auth/components/complete-profile-form";
import { RouteGuard } from "@/features/auth/components/route-guard";

export const dynamic = "force-dynamic";

export default function CompleteProfilePage() {
  return (
    <RouteGuard requireAuth={true}>
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
        {/* Ambient Background Data Stream Effects */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none opacity-60">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px] animate-blob"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-teal-500/10 blur-[150px] animate-blob animation-delay-2000"></div>
        </div>

        <div className="w-full max-w-2xl flex flex-col gap-6 clay-card p-8 sm:p-10 relative">
          {/* Branding header */}
          <div className="flex flex-col gap-2 text-center">
            <span className="text-3xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
              CivicMind
            </span>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 mt-2">
              Complete your profile
            </h1>
            <p className="text-sm text-slate-500">
              Tell us who you are to customize your dashboard experience.
            </p>
          </div>

          <CompleteProfileForm />
        </div>
      </div>
    </RouteGuard>
  );
}
