/**
 * @file src/app/page.tsx
 * @description CivicMind Landing Page.
 * Styled with a minimal, premium, spacious theme inspired by Linear and Stripe.
 */

import Link from "next/link";
import { appConfig } from "@/config/app";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Header Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-primary hover:opacity-90 transition-opacity">
            {appConfig.name}
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 px-3.5 py-2 rounded-md transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-20 md:py-32 flex flex-col gap-24">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-primary bg-primary/10 rounded-full">
            Version {appConfig.version} Release
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-none text-foreground">
            Connect Citizens and Officials through Civic Intelligence
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl">
            {appConfig.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full sm:w-auto">
            <Link
              href="/register"
              className="inline-flex items-center justify-center font-medium bg-primary text-primary-foreground hover:bg-primary/95 h-11 px-6 rounded-md shadow-sm transition-all duration-200"
            >
              Report a Civic Issue
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center font-medium border border-border bg-background hover:bg-muted text-foreground h-11 px-6 rounded-md transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-3 p-6 border border-border rounded-lg bg-card text-card-foreground">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              AI
            </div>
            <h3 className="text-base font-semibold">Orchestrated Dispatch</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Generative AI automatically categorizes issue reports, gauges urgency ratings, and assigns city departments instantly.
            </p>
          </div>

          <div className="flex flex-col gap-3 p-6 border border-border rounded-lg bg-card text-card-foreground">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              🗺️
            </div>
            <h3 className="text-base font-semibold">Interactive Mapping</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Identify and log neighborhood issues visually on high-fidelity maps with automated reverse-geocoding support.
            </p>
          </div>

          <div className="flex flex-col gap-3 p-6 border border-border rounded-lg bg-card text-card-foreground">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              👥
            </div>
            <h3 className="text-base font-semibold">Community Tracking</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Upvote local projects, comment on municipal work paths, and view verified updates from agency officials in real-time.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            &copy; {new Date().getFullYear()} {appConfig.company}. All rights reserved.
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="hover:underline">Dashboard</Link>
            <Link href="/register" className="hover:underline">Register</Link>
            <a href={`mailto:${appConfig.supportEmail}`} className="hover:underline">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
