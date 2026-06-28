/**
 * @file src/app/(dashboard)/officer/layout.tsx
 * @description Layout for the Officer workspace, including the official duty navigation bar.
 */

"use client";

import { useAuth } from "@/providers/auth-provider";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateOfficerAvailabilityAction } from "@/app/actions/officer.actions";
import { User, LogOut, CheckCircle2, AlertCircle, LayoutDashboard, Shield } from "lucide-react";

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [availability, setAvailability] = useState<"available" | "busy" | "offline">("available");

  useEffect(() => {
    if (profile?.availability) {
      setAvailability(profile.availability);
    }
  }, [profile]);

  const handleAvailabilityChange = async (val: "available" | "busy" | "offline") => {
    if (!profile?.uid) return;
    setAvailability(val);
    try {
      await updateOfficerAvailabilityAction(profile.uid, profile.uid, val);
    } catch (err) {
      console.error("Failed to update availability:", err);
    }
  };

  const navLinks = [
    { label: "Dashboard", href: "/officer", icon: LayoutDashboard },
    { label: "Assigned Cases", href: "/officer/assigned", icon: AlertCircle },
    { label: "Completed Cases", href: "/officer/completed", icon: CheckCircle2 },
    { label: "Profile", href: "/officer/profile", icon: User },
  ];

  return (
    <RouteGuard allowedRoles={["officer"]}>
      <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 pb-16">
        {/* Navigation Bar */}
        <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/officer" className="font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 text-lg">
                CIVICMIND
              </Link>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-500/30">
                Staff Console
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "text-indigo-400 border-b-2 border-indigo-500 pb-1"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <link.icon className="h-3.5 w-3.5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-4">
              {/* Duty Status select */}
              <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
                <span className="text-slate-400 font-semibold">Duty:</span>
                <select
                  value={availability}
                  onChange={(e) => handleAvailabilityChange(e.target.value as "available" | "busy" | "offline")}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-bold capitalize"
                >
                  <option value="available" className="bg-slate-950 text-emerald-400">Available</option>
                  <option value="busy" className="bg-slate-950 text-amber-400">Busy</option>
                  <option value="offline" className="bg-slate-950 text-slate-400">Offline</option>
                </select>
              </div>

              {/* Profile Avatar */}
              <Link href="/officer/profile" className="relative group flex items-center">
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt="Officer Avatar"
                    className="h-8 w-8 rounded-full border border-indigo-500/50 object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full border border-indigo-500/50 bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xs font-bold group-hover:scale-105 transition-transform">
                    {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : "O"}
                  </div>
                )}
              </Link>

              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded-lg"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation bar */}
        <div className="md:hidden border-b border-slate-800 bg-slate-950/40 backdrop-blur-md px-6 py-2 flex justify-around sticky top-16 z-40">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  isActive ? "text-indigo-400" : "text-slate-450"
                }`}
              >
                <link.icon className="h-3 w-3" />
                {link.label.split(" ")[0]}
              </Link>
            );
          })}
        </div>

        {/* Main Content Area */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </RouteGuard>
  );
}
