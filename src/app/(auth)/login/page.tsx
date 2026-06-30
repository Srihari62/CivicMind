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
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-800 selection:bg-indigo-500/20 selection:text-slate-900 relative overflow-x-hidden">
        {/* Ambient Background Data Stream Effects */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-65">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-200/30 blur-[120px] animate-blob" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-200/20 blur-[150px] animate-blob animation-delay-2000" />
        </div>

        {/* Header Navigation */}
        <header className="fixed top-0 left-0 z-40 w-full border-b border-slate-100 bg-white/70 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="text-xl font-black tracking-tight text-blue-600 flex items-center gap-2 hover:opacity-90 transition-opacity">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-md text-sm">CM</span>
              CivicMind
            </Link>
            <nav className="flex items-center gap-5">
              <Link
                href="/login"
                className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="clay-btn clay-btn-blue text-xs px-5 py-2.5 h-10 shadow-lg text-white"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </header>

        <div className="w-full max-w-md flex flex-col gap-6 clay-card p-8 sm:p-10 relative z-10">
          {/* Branding header */}
          <div className="flex flex-col gap-2 text-center">
            <Link href="/" className="text-3xl font-black tracking-tight text-blue-600 hover:opacity-90 transition-opacity">
              CivicMind
            </Link>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800 mt-2">
              Sign in to your account
            </h1>
            <p className="text-sm text-slate-500">
              Enter your email and password below to log in.
            </p>
          </div>

          <LoginForm />

          <div className="text-center text-xs text-slate-500 mt-2 pt-4 border-t border-slate-100">
            Don't have an account?{" "}
            <Link href="/register" className="font-bold text-blue-600 hover:underline underline-offset-4">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
