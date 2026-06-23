/**
 * @file src/app/(auth)/login/page.tsx
 * @description Sign-in page.
 * Wrapped in RouteGuard to redirect authenticated users.
 */

import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";
import { RouteGuard } from "@/features/auth/components/route-guard";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <RouteGuard requireAuth={false}>
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm flex flex-col gap-6">
          {/* Branding header */}
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <Link href="/" className="text-xl font-bold tracking-tight text-primary hover:opacity-90 transition-opacity">
              CivicMind
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Sign in to your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and password below to log in.
            </p>
          </div>

          <LoginForm />

          <div className="text-center sm:text-left text-xs text-muted-foreground mt-2">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline underline-offset-4">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
