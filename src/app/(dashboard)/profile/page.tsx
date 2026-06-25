/**
 * @file src/app/(dashboard)/profile/page.tsx
 * @description Citizen Profile and Achievement Center.
 * Displays user profile, gamification points, levels, badges, activity timeline, and profile editing forms.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { CivicReport } from "@/types";
import { UserRepository } from "@/features/auth/repositories/user.repository";
import { CitizenStatsService } from "@/features/reports/services/stats.service";
import { Award, Shield, CheckCircle, FileText, Globe, Calendar, Phone, Loader2, Sparkles, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { profile, logout } = useAuth();
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("english");
  const [community, setCommunity] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync profile fields into local state when profile changes
  useEffect(() => {
    if (profile) {
      setName(profile.displayName || "");
      setPhone(profile.phoneNumber || "");
      setAvatarUrl(profile.avatarUrl || "");
      setPreferredLanguage((profile as any).preferredLanguage || "english");
      setCommunity((profile as any).community || "");
      
      // Auto-initialize gamification stats if not present
      if (!(profile as any).gamification) {
        CitizenStatsService.initGamification(profile.uid).catch((err: unknown) =>
          console.error("Failed to initialize gamification stats:", err)
        );
      }
    }
  }, [profile]);

  // Subscribe to user reports for timeline
  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, COLLECTIONS.REPORTS),
      where("metadata.createdBy", "==", profile.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: CivicReport[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as CivicReport);
        });
        
        // Sort by createdAt descending
        list.sort((a, b) => new Date(b.timestamps?.createdAt || 0).getTime() - new Date(a.timestamps?.createdAt || 0).getTime());
        setReports(list);
        setLoadingReports(false);
      },
      (error) => {
        console.error("Error reading reports for profile timeline:", error);
        setLoadingReports(false);
      }
    );

    return () => unsubscribe();
  }, [profile?.uid]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    
    setSaving(true);
    try {
      await UserRepository.updateUserProfile(profile.uid, {
        displayName: name,
        phoneNumber: phone,
        avatarUrl,
        preferredLanguage,
        community,
      } as any);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSaving(false);
    }
  };

  // Gamification properties helper
  const stats = (profile as any)?.gamification || {
    points: 0,
    level: 1,
    badges: [] as string[],
    reportsSubmitted: 0,
    reportsResolved: 0,
    reportsVerified: 0,
    streakDays: 0,
  };

  const badgeDescriptions: Record<string, string> = {
    "First Report": "Awarded for reporting your first community incident.",
    "Community Helper": "Verified 5 or more reports submitted by fellow citizens.",
    "Trusted Citizen": "Reached a score of 250 points in civic participation.",
    "Neighborhood Guardian": "Had 5 of your submitted reports successfully resolved.",
    "Civic Champion": "Elite civic contributor with over 1,000 points.",
  };

  return (
    <RouteGuard allowedRoles={["citizen", "officer", "admin"]}>
      <div className="flex min-h-screen flex-col bg-zinc-950 text-white selection:bg-blue-600/30">
        {/* Navigation Bar */}
        <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="font-bold text-blue-500 tracking-wider flex items-center gap-1.5 select-none">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                CivicMind
              </span>
              <nav className="hidden md:flex items-center gap-4 text-sm font-semibold">
                <Link href={profile?.role === "officer" ? "/officer" : profile?.role === "admin" ? "/admin" : "/dashboard"} className="text-zinc-400 hover:text-white transition">
                  Dashboard
                </Link>
                <Link href="/community" className="text-zinc-400 hover:text-white transition">
                  Community Feed
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/profile" className="flex items-center gap-2 border-b-2 border-blue-500 pb-1" title="View Profile">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold font-mono">
                    {profile?.displayName?.[0]?.toUpperCase() || "C"}
                  </div>
                )}
                <span className="text-xs text-zinc-300 font-semibold hidden md:inline-block">
                  {profile?.displayName}
                </span>
              </Link>
              <Button variant="outline" size="sm" onClick={() => logout()} className="border-white/10 hover:bg-zinc-900 text-zinc-300">
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 flex flex-col md:flex-row gap-8">
          
          {/* Left Panel: Profile Detail, Gamification Summary */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Header info */}
            <div className="border border-white/10 rounded-3xl p-6 bg-zinc-900/20 backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row gap-6 items-center shadow-xl">
              {/* Profile Avatar */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500 shrink-0 bg-zinc-950 relative group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-blue-400 text-3xl font-extrabold font-mono bg-blue-500/10">
                    {name?.[0]?.toUpperCase() || "C"}
                  </div>
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2.5">
                  <h1 className="text-2xl font-extrabold tracking-tight text-white">{name || "Citizen"}</h1>
                  <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-blue-650/30 border border-blue-500/20 rounded text-blue-400">
                    Level {stats.level}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mt-1">{profile?.email}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-zinc-500" /> {phone || "No phone added"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-zinc-500" /> {preferredLanguage.toUpperCase()}
                  </span>
                  {community && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" /> {community}
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="border-white/10 hover:bg-zinc-800 self-center md:self-start text-xs h-8"
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </div>

            {/* Profile Editing Form */}
            {isEditing && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                onSubmit={handleSave}
                className="border border-white/10 rounded-3xl p-6 bg-zinc-900/50 flex flex-col gap-4 shadow-xl"
              >
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Update Profile Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-semibold">Display Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your display name" className="bg-zinc-950 border-white/10 text-white" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-semibold">Contact Phone</label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 019-2834" className="bg-zinc-950 border-white/10 text-white" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-semibold">Avatar Image URL</label>
                    <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.jpg" className="bg-zinc-950 border-white/10 text-white" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-semibold">Preferred Language</label>
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="english">English</option>
                      <option value="spanish">Spanish</option>
                      <option value="spanish_mx">Spanish (MX)</option>
                      <option value="arabic">Arabic</option>
                      <option value="chinese">Chinese</option>
                      <option value="french">French</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs text-zinc-400 font-semibold">Neighborhood / Community</label>
                    <Input value={community} onChange={(e) => setCommunity(e.target.value)} placeholder="Downtown / North District" className="bg-zinc-950 border-white/10 text-white" />
                  </div>
                </div>
                <Button type="submit" size="sm" disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-fit mt-2">
                  {saving ? "Saving Changes..." : "Save Preferences"}
                </Button>
              </motion.form>
            )}

            {/* Achievement / Points Overview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-white/10 rounded-2xl p-4 bg-zinc-900/10 backdrop-blur flex flex-col gap-1 shadow-lg">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Civic Points</span>
                <span className="text-2xl font-black text-blue-500 flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-blue-500" /> {stats.points || 0}
                </span>
              </div>
              <div className="border border-white/10 rounded-2xl p-4 bg-zinc-900/10 backdrop-blur flex flex-col gap-1 shadow-lg">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Level Status</span>
                <span className="text-2xl font-black text-indigo-400 flex items-center gap-1.5">
                  <Shield className="w-5 h-5 text-indigo-400" /> Lvl {stats.level || 1}
                </span>
              </div>
              <div className="border border-white/10 rounded-2xl p-4 bg-zinc-900/10 backdrop-blur flex flex-col gap-1 shadow-lg">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Reports submitted</span>
                <span className="text-2xl font-black text-emerald-400 flex items-center gap-1.5">
                  <FileText className="w-5 h-5 text-emerald-400" /> {reports.length}
                </span>
              </div>
              <div className="border border-white/10 rounded-2xl p-4 bg-zinc-900/10 backdrop-blur flex flex-col gap-1 shadow-lg">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Reports resolved</span>
                <span className="text-2xl font-black text-purple-400 flex items-center gap-1.5">
                  <CheckCircle className="w-5 h-5 text-purple-400" /> {reports.filter((r) => r.status === "resolved").length}
                </span>
              </div>
            </div>

            {/* Badges Collection Section */}
            <div className="border border-white/10 rounded-3xl p-6 bg-zinc-900/20 backdrop-blur-md shadow-xl flex flex-col gap-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-500" />
                Badges Portfolio
              </h2>
              {stats.badges && stats.badges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.badges.map((badgeName: string) => (
                    <div key={badgeName} className="border border-white/5 rounded-2xl p-4 bg-zinc-900/40 hover:bg-zinc-900/60 transition flex gap-3.5 items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-lg shadow-inner">
                        🏆
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-zinc-200">{badgeName}</h4>
                        <p className="text-[11px] text-zinc-500 leading-normal mt-0.5">{badgeDescriptions[badgeName] || "Achievement earned."}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-white/5 rounded-2xl p-8 text-center text-zinc-500 text-xs">
                  No badges earned yet. Submit reports, confirm community incidents, and verify events to build your portfolio.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Incident Activity Timeline */}
          <div className="w-full md:w-80 border border-white/10 rounded-3xl p-6 bg-zinc-900/20 backdrop-blur-md shadow-xl flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Activity Timeline
            </h2>

            {loadingReports ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-zinc-500 text-xs text-center py-10 border border-dashed border-white/5 rounded-2xl">
                No activity records found.
              </div>
            ) : (
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[60vh] pr-2">
                {reports.map((report) => (
                  <div key={report.id} className="relative pl-5 border-l border-white/10 pb-4 last:pb-0 flex flex-col gap-1">
                    {/* Timeline Node dot */}
                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-zinc-950" />
                    
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-semibold font-mono">
                      <span>{new Date(report.timestamps?.createdAt || 0).toLocaleDateString()}</span>
                      <span className="capitalize">{report.status}</span>
                    </div>
                    <Link href={`/reports/${report.id}`} className="font-bold text-xs text-zinc-200 hover:text-blue-400 transition line-clamp-1">
                      {report.ai?.assistant?.title || report.metadata.title}
                    </Link>
                    <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {report.ai?.assistant?.description || report.metadata.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </RouteGuard>
  );
}
