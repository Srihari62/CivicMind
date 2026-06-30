/**
 * @file src/app/(dashboard)/reports/new/page.tsx
 * @description Page for citizens to submit a new issue report.
 * Protected by RouteGuard.
 */

"use client";

import Link from "next/link";
import { ReportForm } from "@/features/reports/components/report-form";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { useAuth } from "@/providers/auth-provider";
import { LogOut, LayoutDashboard, MessageSquare, AlertCircle, User } from "lucide-react";
import { motion } from "framer-motion";

export const dynamic = "force-dynamic";

export default function NewReportPage() {
  const { profile, logout } = useAuth();
  
  return (
    <RouteGuard requireAuth={true}>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
        
        {/* Floating Glassmorphic Navigation Bar */}
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-3.5 max-w-6xl mx-auto bg-white/80 border border-white/60 backdrop-blur-2xl rounded-full mt-6 w-[92%] shadow-[0_8px_30px_rgb(163,177,198,0.2)] transition-transform duration-200">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-extrabold text-blue-600 tracking-wider flex items-center gap-1.5 select-none text-base">
              <span className="hidden sm:flex w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="hidden sm:inline">CivicMind</span>
              <span className="sm:hidden w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-md text-sm font-black tracking-normal">CM</span>
            </Link>
            <nav className="hidden md:flex bg-slate-100/80 p-1.5 rounded-full border border-slate-200/50 items-center gap-1 text-[10px] font-black uppercase tracking-widest relative">
              <Link
                href={
                  profile?.role === 'officer'
                    ? '/officer'
                    : profile?.role === 'admin'
                      ? '/admin'
                      : '/dashboard'
                }
                className="relative px-4 py-2 rounded-full transition-all text-slate-500 hover:text-slate-800"
              >
                <span className="relative z-10">Dashboard</span>
              </Link>
              <Link href="/community" className="relative px-4 py-2 rounded-full transition-all text-slate-500 hover:text-slate-800">
                <span className="relative z-10">Community Feed</span>
              </Link>
              <div className="relative px-4 py-2 rounded-full transition-all text-blue-600 cursor-default">
                <motion.div
                  layoutId="nav-indicator-report"
                  className="absolute inset-0 bg-white shadow-sm border border-slate-200/50 rounded-full"
                />
                <span className="relative z-10">Report Issue</span>
              </div>
            </nav>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/profile"
              className="flex items-center gap-2 hover:opacity-80 transition"
              title="View Profile"
            >
              {profile?.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatarUrl}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full border border-white/80 object-cover shadow-sm"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 text-xs font-bold font-mono">
                  {profile?.displayName?.[0]?.toUpperCase() || 'C'}
                </div>
              )}
            </Link>

            <button onClick={() => logout()} className="text-slate-500 hover:bg-slate-100 p-1.5 rounded-full transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Form Container */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 pt-32 pb-24 relative z-10">
          <div className="w-full max-w-xl flex flex-col gap-4">
            <ReportForm />
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-slate-200/80 bg-white/90 backdrop-blur-2xl py-2 px-6 flex justify-around items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <Link 
            href={
              profile?.role === 'officer' ? '/officer' : 
              profile?.role === 'admin' ? '/admin' : '/dashboard'
            } 
            className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Dashboard</span>
          </Link>
          <Link href="/community" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Feed</span>
          </Link>
          <div className="flex flex-col items-center gap-1 p-2 text-blue-600 relative -top-3">
            <div className="bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-500/30">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider mt-1 text-slate-500">Report</span>
          </div>
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <User className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Profile</span>
          </Link>
        </div>
      </div>
    </RouteGuard>
  );
}
