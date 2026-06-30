/**
 * @file src/app/(dashboard)/admin/layout.tsx
 * @description Layout for the Admin workspace, providing strict isolation and shared navigation header.
 */

"use client";

import { useAuth } from "@/providers/auth-provider";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { label: "Intelligence Center", href: "/admin" },
    { label: "Incidents Registry", href: "/admin/reports" },
    { label: "Officer Directory", href: "/admin/officers" },
    { label: "Admin Profile", href: "/admin/profile" },
  ];

  return (
    <RouteGuard allowedRoles={["admin"]}>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 pb-16 relative overflow-x-hidden selection:bg-purple-500/20 selection:text-slate-900">
        {/* Ambient background data stream effects */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-65">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-200/30 blur-[120px] animate-blob" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-200/20 blur-[150px] animate-blob animation-delay-2000" />
        </div>

        {/* Floating Glassmorphic Header */}
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-3.5 max-w-6xl mx-auto bg-white/80 border border-white/60 backdrop-blur-2xl rounded-full mt-6 mx-auto w-[92%] shadow-[0_8px_30px_rgb(163,177,198,0.2)] transition-transform duration-200">
          <div className="flex items-center gap-6">
            <span className="font-extrabold text-blue-600 tracking-wider flex items-center gap-1.5 select-none text-base">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
              CivicMind
            </span>
            <span className="hidden sm:inline-block text-[9px] bg-purple-100 text-purple-650 font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-purple-200/50">
              Admin Console
            </span>
            <nav className="hidden md:flex items-center gap-6 text-xs font-black uppercase tracking-widest">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`transition-all ${
                      isActive
                        ? "text-purple-650 border-b-2 border-purple-500 pb-0.5"
                        : "text-slate-400 hover:text-slate-800"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 font-semibold hidden lg:inline">
              {profile?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
            >
              Sign Out
            </Button>
          </div>
        </header>

        {/* Mobile Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-slate-200/80 bg-white/80 backdrop-blur-2xl py-3 px-6 flex justify-around shadow-2xl">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[10px] font-black uppercase tracking-wider ${
                  isActive ? "text-purple-650" : "text-slate-400"
                }`}
              >
                {link.label.split(" ")[0]}
              </Link>
            );
          })}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 pt-36 pb-24 flex flex-col gap-8 relative z-10">
          {children}
        </main>
      </div>
    </RouteGuard>
  );
}
