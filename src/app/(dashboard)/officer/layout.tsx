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
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 pb-16 relative overflow-x-hidden selection:bg-orange-500/20 selection:text-slate-900">
        {/* Ambient background blob effects */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-65">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-200/30 blur-[120px] animate-blob" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-orange-200/20 blur-[150px] animate-blob animation-delay-2000" />
        </div>

        {/* Floating Glassmorphic Header */}
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-3.5 max-w-6xl mx-auto bg-white/80 border border-white/60 backdrop-blur-2xl rounded-full mt-6 mx-auto w-[92%] shadow-[0_8px_30px_rgb(163,177,198,0.2)] transition-transform duration-200">
          <div className="flex items-center gap-6">
            <span className="font-extrabold text-blue-600 tracking-wider flex items-center gap-1.5 select-none text-base">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              CivicMind
            </span>
            <span className="hidden sm:inline-block text-[9px] bg-orange-100 text-orange-650 font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-orange-200/50">
              Staff Console
            </span>
            <nav className="hidden md:flex items-center gap-6 text-xs font-black uppercase tracking-widest">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "text-orange-650 border-b-2 border-orange-500 pb-0.5"
                        : "text-slate-400 hover:text-slate-800"
                    }`}
                  >
                    <link.icon className="h-3.5 w-3.5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Duty Status Select */}
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-full px-3.5 py-1.5 text-xs shadow-inner">
              <span className="text-slate-400 font-bold">Duty:</span>
              <select
                value={availability}
                onChange={(e) => handleAvailabilityChange(e.target.value as "available" | "busy" | "offline")}
                className="bg-transparent text-slate-700 focus:outline-none cursor-pointer font-extrabold capitalize"
              >
                <option value="available" className="bg-slate-50 text-emerald-600">Available</option>
                <option value="busy" className="bg-slate-50 text-orange-600">Busy</option>
                <option value="offline" className="bg-slate-50 text-slate-500">Offline</option>
              </select>
            </div>

            {/* Profile Avatar */}
            <Link href="/officer/profile" className="relative group flex items-center">
              {profile?.photoURL ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.photoURL}
                  alt="Officer Avatar"
                  className="h-8 w-8 rounded-full border border-orange-500/55 object-cover group-hover:scale-105 transition-transform shadow-md"
                />
              ) : (
                <div className="h-8 w-8 rounded-full border border-orange-550/20 bg-orange-100 flex items-center justify-center text-orange-650 text-xs font-bold group-hover:scale-105 transition-transform shadow-inner">
                  {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : "O"}
                </div>
              )}
            </Link>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
            >
              Sign Out
            </Button>
          </div>
        </header>

        {/* Mobile Navigation bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-slate-200/80 bg-white/80 backdrop-blur-2xl py-3 px-6 flex justify-around shadow-2xl">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[10px] font-bold uppercase tracking-wider flex flex-col items-center gap-1 ${
                  isActive ? "text-orange-650" : "text-slate-400"
                }`}
              >
                <link.icon className="h-4 w-4" />
                <span>{link.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 pt-36 pb-10 z-10 relative">
          {children}
        </main>
      </div>
    </RouteGuard>
  );
}
