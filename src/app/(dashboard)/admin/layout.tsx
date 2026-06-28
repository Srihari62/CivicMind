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
      <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-900 to-black text-slate-100 pb-16">
        {/* Navigation Bar */}
        <header className="border-b border-white/5 bg-black/60 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/admin" className="font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-500 text-lg">
                CIVICMIND
              </Link>
              <span className="text-[10px] bg-red-500/10 text-red-400 font-mono px-2 py-0.5 rounded border border-red-500/20 font-black uppercase tracking-widest">
                Municipal Command Center
              </span>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-xs font-black uppercase tracking-widest transition-all ${
                      isActive
                        ? "text-red-400"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-400 font-semibold hidden lg:inline">
                {profile?.email} ({profile?.role})
              </span>
              <Button variant="outline" size="sm" onClick={() => logout()} className="border-white/10 hover:bg-zinc-900 text-zinc-300">
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation */}
        <div className="md:hidden border-b border-white/5 bg-black/40 backdrop-blur-md px-6 py-2 flex justify-around sticky top-16 z-40">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isActive ? "text-red-400" : "text-zinc-400"
                }`}
              >
                {link.label.split(" ")[0]}
              </Link>
            );
          })}
        </div>

        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
          {children}
        </main>
      </div>
    </RouteGuard>
  );
}
