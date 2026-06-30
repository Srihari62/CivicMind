/**
 * @file src/app/page.tsx
 * @description CivicMind Landing Page.
 * Styled with a minimal, premium, spacious theme inspired by Linear and Stripe.
 */

import Link from "next/link";
import { appConfig } from "@/config/app";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/20 relative overflow-hidden">
      {/* Decorative Pastel Background Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-200/40 blur-[120px] pointer-events-none animate-blob" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-200/30 blur-[130px] pointer-events-none animate-blob animation-delay-2000" />
      
      {/* Header Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight text-primary flex items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-md text-sm">CM</span>
            {appConfig.name}
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

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-20 md:py-28 flex flex-col gap-24 relative z-10">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center gap-8 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-extrabold text-blue-650 bg-blue-100/70 border border-blue-200/50 rounded-full shadow-sm">
            Version {appConfig.version} Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-slate-900">
            Connect Citizens and Officials through <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-650 bg-clip-text text-transparent">Civic Intelligence</span>
          </h1>
          <p className="text-base md:text-lg text-slate-500 max-w-2xl font-medium leading-relaxed">
            {appConfig.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full sm:w-auto justify-center">
            <Link
              href="/register"
              className="clay-btn clay-btn-blue h-12 px-8 shadow-xl text-sm"
            >
              Report a Civic Issue
            </Link>
            <Link
              href="/login"
              className="clay-btn clay-btn-white h-12 px-8 shadow-md text-sm border-slate-200"
            >
              Go to Dashboard
            </Link>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="clay-card p-8 flex flex-col gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
              AI
            </div>
            <h3 className="text-lg font-black text-slate-800">Orchestrated Dispatch</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Generative AI automatically categorizes issue reports, gauges urgency ratings, and assigns city departments instantly.
            </p>
          </div>

          <div className="clay-card p-8 flex flex-col gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
              🗺️
            </div>
            <h3 className="text-lg font-black text-slate-800">Interactive Mapping</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Identify and log neighborhood issues visually on high-fidelity maps with automated reverse-geocoding support.
            </p>
          </div>

          <div className="clay-card p-8 flex flex-col gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-650 flex items-center justify-center text-white font-bold text-lg shadow-md">
              👥
            </div>
            <h3 className="text-lg font-black text-slate-800">Community Tracking</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Upvote local projects, comment on municipal work paths, and view verified updates from agency officials in real-time.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white/40 mt-auto relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-bold uppercase tracking-wider">
          <div>
            &copy; {new Date().getFullYear()} {appConfig.company}. All rights reserved.
          </div>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-slate-600 transition-colors">Dashboard</Link>
            <Link href="/register" className="hover:text-slate-600 transition-colors">Register</Link>
            <a href={`mailto:${appConfig.supportEmail}`} className="hover:text-slate-600 transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
