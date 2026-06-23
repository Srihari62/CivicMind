/**
 * @file src/app/(auth)/register/page.tsx
 * @description Registration page.
 * Renders the RegisterForm in a clean, spacious layout.
 */

import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/register-form";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Branding header */}
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <Link href="/" className="text-xl font-bold tracking-tight text-primary hover:opacity-90 transition-opacity">
            CivicMind
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign up to report local issues and coordinate resolutions.
          </p>
        </div>

        <RegisterForm />

        <div className="text-center sm:text-left text-xs text-muted-foreground mt-2">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline underline-offset-4">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
