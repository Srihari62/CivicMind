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
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { CivicReport } from "@/types";
import { UserRepository } from "@/features/auth/repositories/user.repository";
import { CitizenStatsService } from "@/features/reports/services/stats.service";
import { MediaService } from "@/features/media/services/media.service";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "@/services/firebase/auth";
import { Award, Shield, CheckCircle, FileText, Globe, Calendar, Phone, Loader2, Sparkles, MapPin, Camera, Lock, History, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MapPicker from "@/components/maps/MapPicker";

export default function ProfilePage() {
  const { profile, logout, refreshProfile } = useAuth();
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [community, setCommunity] = useState("");
  const [homeLocation, setHomeLocation] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Points history state
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [loadingPointsHistory, setLoadingPointsHistory] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);

  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showSubmittedModal, setShowSubmittedModal] = useState(false);
  const [showResolvedModal, setShowResolvedModal] = useState(false);

  useEffect(() => {
    if (!profile?.uid || !showPointsModal) return;
    
    setLoadingPointsHistory(true);
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, "users", profile.uid, "pointsTransactions")
        );
        const snap = await getDocs(q);
        const items: any[] = [];
        snap.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        // Sort by timestamp desc
        items.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        
        // If history is empty, generate derived/mock history matching user's current points
        if (items.length === 0) {
          // Derived from resolved reports
          const resolvedCount = reports.filter((r) => r.status === "resolved").length;
          for (let i = 0; i < resolvedCount; i++) {
            items.push({
              id: `derived-resolved-${i}`,
              points: 100,
              action: "resolve",
              timestamp: new Date().toISOString(),
              description: "Report Resolved (+100 Points)",
            });
          }
          
          // Remaining points as initial signup/badge rewards
          const currentPoints = (profile as any).gamification?.points || 0;
          const derivedSum = items.reduce((sum, item) => sum + item.points, 0);
          const diff = currentPoints - derivedSum;
          if (diff > 0) {
            items.push({
              id: "derived-welcome",
              points: diff,
              action: "welcome",
              timestamp: new Date((profile as any).timestamps?.createdAt || Date.now()).toISOString(),
              description: `Civic Welcome & Milestone Rewards (+${diff} Points)`,
            });
          }
        }
        
        setPointsHistory(items);
      } catch (err) {
        console.error("Error fetching points history:", err);
      } finally {
        setLoadingPointsHistory(false);
      }
    };
    fetchHistory();
  }, [profile?.uid, showPointsModal, reports, profile]);

  // Sync profile fields into local state when profile changes
  useEffect(() => {
    if (profile) {
      setName(profile.displayName || "");
      setPhone(profile.phoneNumber || "");
      setAvatarUrl(profile.avatarUrl || "");
      setPreferredLanguage((profile as any).preferredLanguage || "English");
      setCommunity((profile as any).community || "");
      setHomeLocation((profile as any).homeLocation || null);
      
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
        
        CitizenStatsService.syncStats(profile.uid)
          .then(() => refreshProfile())
          .catch((err) => {
            console.error("Failed to sync gamification stats on snapshot update:", err);
          });
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
        homeLocation,
      } as any);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSaving(false);
    }
  };

  // Avatar upload handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!profile?.uid) return;

    setUploadingAvatar(true);
    try {
      const assets = await MediaService.uploadFiles([files[0]], `profiles/${profile.uid}`, profile.uid);
      if (assets.length > 0) {
        const newUrl = assets[0].url;
        setAvatarUrl(newUrl);
        // Auto save to firestore profile
        await UserRepository.updateUserProfile(profile.uid, {
          avatarUrl: newUrl,
        } as any);
      }
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      alert(err.message || "Failed to upload avatar image.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Password update handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const user = auth.currentUser;
    if (!user || !user.email) {
      setPasswordError("No authenticated session found.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      setPasswordSuccess("Security password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Password update error:", err);
      setPasswordError(err.message || "Failed to update security credentials. Ensure current password is correct.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Gamification properties helper
  const stats = (profile as any)?.gamification || {
    points: 0,
    contributionScore: 0,
    civicScore: 0,
    level: 1,
    contributionLevel: 1,
    civicLevel: 1,
    badges: [] as string[],
    reportsSubmitted: 0,
    reportsAssigned: 0,
    reportsResolved: 0,
    reportsDuplicate: 0,
    reportsFake: 0,
    reportsVerified: 0,
    streakDays: 0,
    longestStreak: 0,
    likesReceived: 0,
    commentsPosted: 0,
    feedReputation: 0,
    achievementProgress: 0,
  };

  const allBadges = [
    { name: "First Report", requirement: "Submit 1 or more community reports", description: "Awarded for reporting your first community incident.", icon: "🌱" },
    { name: "Community Helper", requirement: "Verify 5 or more community reports", description: "Verified 5 or more reports submitted by fellow citizens.", icon: "🤝" },
    { name: "Trusted Citizen", requirement: "Reach 250 or more Civic Points", description: "Reached a score of 250 points in civic participation.", icon: "🛡️" },
    { name: "Civic Champion", requirement: "Reach 1,000 or more Civic Points", description: "Elite civic contributor with over 1,000 points.", icon: "👑" },
    { name: "Bronze Resolver", requirement: "Have 5 of your reports successfully resolved", description: "Successfully resolved 5 community reports.", icon: "🥉" },
    { name: "Silver Resolver", requirement: "Have 15 of your reports successfully resolved", description: "Successfully resolved 15 community reports.", icon: "🥈" },
    { name: "Gold Resolver", requirement: "Have 30 of your reports successfully resolved", description: "Successfully resolved 30 community reports.", icon: "🥇" },
  ];

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
                  /* eslint-disable-next-line @next/next/no-img-element */
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
                  /* eslint-disable-next-line @next/next/no-img-element */
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
                  {(homeLocation?.formattedAddress || community) && (
                    <span className="flex items-center gap-1 max-w-[280px] md:max-w-[400px] truncate" title={homeLocation?.formattedAddress || community}>
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" /> {homeLocation?.formattedAddress || community}
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
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex flex-col gap-6"
              >
                {/* Form 1: General Info & Image Upload */}
                <form
                  onSubmit={handleSave}
                  className="border border-white/10 rounded-3xl p-6 bg-zinc-900/50 flex flex-col gap-4 shadow-xl"
                >
                  <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Update Profile Details</h3>
                  
                  {/* Upload Avatar Widget */}
                  <div className="flex flex-col md:flex-row gap-4 items-center p-4 bg-zinc-950/40 border border-white/5 rounded-2xl">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/10 shrink-0 bg-zinc-950 flex items-center justify-center font-bold text-zinc-400 text-lg">
                      {avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        (name || profile?.email || "C").charAt(0).toUpperCase()
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col gap-1 w-full text-left">
                      <span className="text-xs font-semibold text-zinc-350">Profile Picture Avatar</span>
                      <span className="text-[10px] text-zinc-500">JPG, PNG, WEBP formats. Direct Cloudinary upload.</span>
                      <div className="flex items-center gap-2 mt-1">
                        <label className="bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors">
                          <Camera className="w-3.5 h-3.5 text-zinc-550" /> Choose Image file
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                            disabled={uploadingAvatar}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

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
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Telugu">Telugu</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Kannada">Kannada</option>
                        <option value="Malayalam">Malayalam</option>
                        <option value="Marathi">Marathi</option>
                        <option value="Gujarati">Gujarati</option>
                        <option value="Punjabi">Punjabi</option>
                        <option value="Bengali">Bengali</option>
                        <option value="Odia">Odia</option>
                        <option value="Urdu">Urdu</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs text-zinc-400 font-semibold">Neighborhood / Community Name</label>
                      <Input value={community} onChange={(e) => setCommunity(e.target.value)} placeholder="e.g. Downtown / Indiranagar" className="bg-zinc-950 border-white/10 text-white" />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2 font-sans">
                      <label className="text-xs text-zinc-400 font-semibold">Home / Community Location Address</label>
                      {homeLocation?.formattedAddress && (
                        <div className="p-3 text-xs bg-zinc-950 border border-white/10 rounded-xl text-zinc-300 font-medium leading-relaxed">
                          {homeLocation.formattedAddress}
                        </div>
                      )}
                      <MapPicker
                        initialLocation={homeLocation}
                        onLocationChange={(loc) => {
                          setHomeLocation(loc);
                          if (!community) {
                            setCommunity(loc.locality || loc.subLocality || loc.city || "");
                          }
                        }}
                      />
                    </div>
                  </div>
                  <Button type="submit" size="sm" disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-fit mt-2">
                    {saving ? "Saving Changes..." : "Save Preferences"}
                  </Button>
                </form>

                {/* Form 2: Password / Security credentials */}
                <form
                  onSubmit={handleUpdatePassword}
                  className="border border-white/10 rounded-3xl p-6 bg-zinc-900/50 flex flex-col gap-4 shadow-xl"
                >
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-500" /> Change Security Password
                  </h3>
                  
                  {passwordError && (
                    <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                      {passwordError}
                    </div>
                  )}
                  
                  {passwordSuccess && (
                    <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                      {passwordSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-400 font-semibold">Current Password</label>
                      <Input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password to authorize"
                        className="bg-zinc-950 border-white/10 text-white"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-400 font-semibold">New Password</label>
                        <Input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="bg-zinc-950 border-white/10 text-white"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-400 font-semibold">Confirm New Password</label>
                        <Input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Verify new password"
                          className="bg-zinc-950 border-white/10 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={updatingPassword}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold w-fit mt-2"
                  >
                    {updatingPassword ? "Updating Password..." : "Update Credentials"}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Achievement / Points Overview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Contribution Points */}
              <div
                className="border border-white/10 rounded-2xl p-4 bg-zinc-900/10 backdrop-blur flex flex-col gap-1 shadow-lg cursor-pointer hover:bg-zinc-900/35 transition duration-200 select-none group"
                onClick={() => setShowPointsModal(true)}
                title="View Gamification scoring breakdown"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono group-hover:text-emerald-400 transition-colors">Contrib Points</span>
                  <History className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 group-hover:rotate-12 transition-all" />
                </div>
                <span className="text-2xl font-black text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <Zap className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" /> {stats.contributionScore || 0}
                </span>
              </div>

              {/* Civic Points */}
              <div
                className="border border-white/10 rounded-2xl p-4 bg-zinc-900/10 backdrop-blur flex flex-col gap-1 shadow-lg cursor-pointer hover:bg-zinc-900/35 transition duration-200 select-none group"
                onClick={() => setShowPointsModal(true)}
                title="View Civic Points History"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono group-hover:text-blue-400 transition-colors">Civic Points</span>
                  <History className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-400 group-hover:rotate-12 transition-all" />
                </div>
                <span className="text-2xl font-black text-blue-500 flex items-center gap-1.5 mt-0.5">
                  <Sparkles className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" /> {stats.civicScore || 0}
                </span>
              </div>

              {/* Contrib Level */}
              <div
                className="border border-white/10 rounded-2xl p-4 bg-zinc-900/10 backdrop-blur flex flex-col gap-1 shadow-lg cursor-pointer hover:bg-zinc-900/35 transition duration-200 select-none group"
                onClick={() => setShowLevelModal(true)}
                title="View Level Progress"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono group-hover:text-emerald-400 transition-colors">Contrib Level</span>
                  <History className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 group-hover:rotate-12 transition-all" />
                </div>
                <span className="text-2xl font-black text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <Shield className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" /> Lvl {stats.contributionLevel || 1}
                </span>
              </div>

              {/* Civic Level */}
              <div
                className="border border-white/10 rounded-2xl p-4 bg-zinc-900/10 backdrop-blur flex flex-col gap-1 shadow-lg cursor-pointer hover:bg-zinc-900/35 transition duration-200 select-none group"
                onClick={() => setShowLevelModal(true)}
                title="View Level Progress"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono group-hover:text-blue-400 transition-colors">Civic Level</span>
                  <History className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-400 group-hover:rotate-12 transition-all" />
                </div>
                <span className="text-2xl font-black text-blue-400 flex items-center gap-1.5 mt-0.5">
                  <Award className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" /> Lvl {stats.civicLevel || 1}
                </span>
              </div>

              {/* Submitted Reports */}
              <div
                className="border border-white/10 rounded-2xl p-4 bg-zinc-900/10 backdrop-blur flex flex-col gap-1 shadow-lg cursor-pointer hover:bg-zinc-900/35 transition duration-200 select-none group"
                onClick={() => setShowSubmittedModal(true)}
                title="View Submitted Reports History"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono group-hover:text-amber-400 transition-colors">Submitted</span>
                  <History className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 group-hover:rotate-12 transition-all" />
                </div>
                <span className="text-2xl font-black text-amber-400 flex items-center gap-1.5 mt-0.5">
                  <FileText className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" /> {stats.reportsSubmitted || 0}
                </span>
              </div>

              {/* Resolved Reports */}
              <div
                className="border border-white/10 rounded-2xl p-4 bg-zinc-900/10 backdrop-blur flex flex-col gap-1 shadow-lg cursor-pointer hover:bg-zinc-900/35 transition duration-200 select-none group"
                onClick={() => setShowResolvedModal(true)}
                title="View Resolved Reports History"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono group-hover:text-purple-400 transition-colors">Resolved</span>
                  <History className="w-3.5 h-3.5 text-zinc-500 group-hover:text-purple-400 group-hover:rotate-12 transition-all" />
                </div>
                <span className="text-2xl font-black text-purple-400 flex items-center gap-1.5 mt-0.5">
                  <CheckCircle className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" /> {stats.reportsResolved || 0}
                </span>
              </div>
            </div>

            {/* Citizen Gamification Details Card */}
            <div className="border border-white/10 rounded-3xl p-6 bg-gradient-to-br from-indigo-950/20 via-zinc-900/30 to-zinc-950/45 backdrop-blur-md shadow-xl flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 fill-indigo-400/10" />
                  Civic Standing Portfolio
                </h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  Lvl {stats.level || 1}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="sm:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-zinc-400">Total XP Points</span>
                    <span className="font-mono font-bold text-white text-sm">{stats.points || 0} PTS</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-zinc-400">Contribution Score</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">{stats.contributionScore || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-zinc-400">Civic Score</span>
                    <span className="font-mono font-bold text-blue-400 text-sm">{stats.civicScore || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-zinc-400">Reports Submitted</span>
                    <span className="font-mono font-bold text-white text-sm">{stats.reportsSubmitted || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-zinc-400">Reports Resolved</span>
                    <span className="font-mono font-bold text-white text-sm">{stats.reportsResolved || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-zinc-400">Community Verifications</span>
                    <span className="font-mono font-bold text-white text-sm">{stats.reportsVerified || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-zinc-400">Active Streak</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">🔥 {stats.streakDays || 0} Days</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-zinc-400">Longest Streak</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">🔥 {stats.longestStreak || 0} Days</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-zinc-400">Likes Received</span>
                    <span className="font-mono font-bold text-zinc-300 text-sm">{stats.likesReceived || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-zinc-400">Comments Posted</span>
                    <span className="font-mono font-bold text-zinc-300 text-sm">{stats.commentsPosted || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-zinc-400">Feed Reputation</span>
                    <span className="font-mono font-bold text-indigo-400 text-sm">⭐ {stats.feedReputation || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-zinc-400">Duplicate / Fake</span>
                    <span className="font-mono font-bold text-zinc-400 text-sm">{stats.reportsDuplicate || 0} / {stats.reportsFake || 0}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center border-l border-white/5 pl-6 gap-2 shrink-0">
                  <div className="relative w-20 h-20 flex items-center justify-center bg-zinc-950/40 rounded-full border border-white/5">
                    <div className="absolute inset-1 rounded-full border-2 border-zinc-800" />
                    <span className="text-xl font-black text-white font-mono">{stats.level || 1}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 text-center uppercase tracking-wider font-semibold">
                    Current Level
                  </span>
                </div>
              </div>
            </div>

            {/* Badges Collection Section */}
            <div className="border border-white/10 rounded-3xl p-6 bg-zinc-900/20 backdrop-blur-md shadow-xl flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-500" />
                  Badges Portfolio
                </h2>
                <p className="text-xs text-zinc-400">
                  Earn unique badges by actively participating in municipal reporting and verification.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allBadges.map((badge) => {
                  const isEarned = (stats.badges || []).includes(badge.name);
                  return (
                    <div
                      key={badge.name}
                      className={`border rounded-2xl p-4 transition flex gap-3.5 items-center relative ${
                        isEarned
                          ? "border-blue-500/20 bg-zinc-900/40 hover:bg-zinc-900/60"
                          : "border-white/5 bg-zinc-950/20 opacity-50"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-inner shrink-0 ${
                        isEarned
                          ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                          : "bg-zinc-800/40 border border-white/5 text-zinc-500"
                      }`}>
                        {badge.icon || "🏆"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`font-extrabold text-sm ${isEarned ? "text-zinc-200" : "text-zinc-400"}`}>
                            {badge.name}
                          </h4>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isEarned
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-zinc-800/50 text-zinc-550 border border-white/5"
                          }`}>
                            {isEarned ? "Earned" : "Locked"}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal mt-0.5">
                          {badge.description}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-medium mt-1 font-mono">
                          Requirement: {badge.requirement}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
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

        {/* Civic Points History Modal */}
        <AnimatePresence>
          {showPointsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg border border-white/10 rounded-3xl p-6 bg-zinc-900 shadow-2xl flex flex-col gap-4 max-h-[80vh] overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    <h2 className="text-lg font-bold text-white">Civic Points Ledger</h2>
                  </div>
                  <button
                    onClick={() => setShowPointsModal(false)}
                    className="text-zinc-400 hover:text-white transition text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-800"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
                  {loadingPointsHistory ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <span className="text-xs font-medium">Retrieving points ledger...</span>
                    </div>
                  ) : pointsHistory.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs">
                      No transactions found. Points are earned through community actions.
                    </div>
                  ) : (
                    pointsHistory.map((item) => (
                      <div
                        key={item.id}
                        className="border border-white/5 rounded-2xl p-4 bg-zinc-950/40 hover:bg-zinc-950/60 transition flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-zinc-200">
                            {item.description}
                          </h4>
                          <p className="text-[10px] text-zinc-500 font-mono mt-1">
                            Date: {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <span className={`text-xs font-black font-mono shrink-0 px-2.5 py-1 rounded-lg ${
                          item.points >= 0
                            ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/10"
                            : "text-red-400 bg-red-500/10 border border-red-500/10"
                        }`}>
                          {item.points >= 0 ? `+${item.points}` : item.points} PTS
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Level Status History Modal */}
        <AnimatePresence>
          {showLevelModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl border border-white/10 rounded-3xl p-6 bg-zinc-900 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-white">Gamification Level Progression</h2>
                  </div>
                  <button
                    onClick={() => setShowLevelModal(false)}
                    className="text-zinc-400 hover:text-white transition text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-800"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 pr-1 py-1">
                  {/* Contribution Level */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-white/5 pb-1">
                      Contribution Level Status (Lvl {stats.contributionLevel || 1})
                    </h3>
                    {[
                      { lvl: 1, name: "Level 1: Novice Contributor", xp: 0 },
                      { lvl: 2, name: "Level 2: Active Helper", xp: 100 },
                      { lvl: 3, name: "Level 3: Neighborhood Watch", xp: 250 },
                      { lvl: 4, name: "Level 4: Community Guardian", xp: 500 },
                      { lvl: 5, name: "Level 5: Civic Vanguard", xp: 1000 },
                    ].map((levelObj) => {
                      const isUnlocked = (stats.contributionScore || 0) >= levelObj.xp;
                      return (
                        <div
                          key={levelObj.lvl}
                          className={`border rounded-2xl p-3.5 transition flex items-center justify-between gap-3 ${
                            isUnlocked
                              ? "border-emerald-500/20 bg-emerald-500/5"
                              : "border-white/5 bg-zinc-950/40 opacity-60"
                          }`}
                        >
                          <div>
                            <h4 className="font-extrabold text-xs text-zinc-200">
                              {levelObj.name}
                            </h4>
                            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
                              Required: {levelObj.xp} PTS
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isUnlocked
                              ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25"
                              : "text-zinc-500 bg-zinc-800/40 border border-white/5"
                          }`}>
                            {isUnlocked ? "Unlocked ✅" : "Locked 🔒"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Civic Level */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-white/5 pb-1">
                      Civic Level Status (Lvl {stats.civicLevel || 1})
                    </h3>
                    {[
                      { lvl: 1, name: "Level 1: Civic Rookie", xp: 0 },
                      { lvl: 2, name: "Level 2: Active Citizen", xp: 100 },
                      { lvl: 3, name: "Level 3: Trusted Citizen", xp: 250 },
                      { lvl: 4, name: "Level 4: Civic Pillar", xp: 500 },
                      { lvl: 5, name: "Level 5: Civic Champion", xp: 1000 },
                    ].map((levelObj) => {
                      const isUnlocked = (stats.civicScore || 0) >= levelObj.xp;
                      return (
                        <div
                          key={levelObj.lvl}
                          className={`border rounded-2xl p-3.5 transition flex items-center justify-between gap-3 ${
                            isUnlocked
                              ? "border-blue-500/20 bg-blue-500/5"
                              : "border-white/5 bg-zinc-950/40 opacity-60"
                          }`}
                        >
                          <div>
                            <h4 className="font-extrabold text-xs text-zinc-200">
                              {levelObj.name}
                            </h4>
                            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
                              Required: {levelObj.xp} PTS
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isUnlocked
                              ? "text-blue-400 bg-blue-500/10 border border-blue-500/25"
                              : "text-zinc-500 bg-zinc-800/40 border border-white/5"
                          }`}>
                            {isUnlocked ? "Unlocked ✅" : "Locked 🔒"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reports Submitted History Modal */}
        <AnimatePresence>
          {showSubmittedModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg border border-white/10 rounded-3xl p-6 bg-zinc-900 shadow-2xl flex flex-col gap-4 max-h-[80vh] overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-lg font-bold text-white">Reports Submitted History</h2>
                  </div>
                  <button
                    onClick={() => setShowSubmittedModal(false)}
                    className="text-zinc-400 hover:text-white transition text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-800"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
                  {reports.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs">
                      No reports submitted yet.
                    </div>
                  ) : (
                    reports.map((report) => (
                      <div
                        key={report.id}
                        className="border border-white/5 rounded-2xl p-4 bg-zinc-950/40 hover:bg-zinc-950/60 transition flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 animate-none">
                          <h4 className="font-extrabold text-sm text-zinc-200 truncate max-w-[240px] block">
                            {report.ai?.assistant?.title || report.metadata.title}
                          </h4>
                          <p className="text-[10px] text-zinc-500 font-mono mt-1">
                            Submitted: {new Date(report.timestamps?.createdAt || 0).toLocaleString()}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 capitalize border border-white/5">
                          {report.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reports Resolved History Modal */}
        <AnimatePresence>
          {showResolvedModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg border border-white/10 rounded-3xl p-6 bg-zinc-900 shadow-2xl flex flex-col gap-4 max-h-[80vh] overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg font-bold text-white">Reports Resolved History</h2>
                  </div>
                  <button
                    onClick={() => setShowResolvedModal(false)}
                    className="text-zinc-400 hover:text-white transition text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-800"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
                  {reports.filter((r) => r.status === "resolved").length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs">
                      No resolved reports yet.
                    </div>
                  ) : (
                    reports.filter((r) => r.status === "resolved").map((report) => (
                      <div
                        key={report.id}
                        className="border border-white/5 rounded-2xl p-4 bg-zinc-950/40 hover:bg-zinc-950/60 transition flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-zinc-200 truncate max-w-[240px] block">
                            {report.ai?.assistant?.title || report.metadata.title}
                          </h4>
                          <p className="text-[10px] text-zinc-500 font-mono mt-1">
                            Resolved: {new Date((report.timestamps as any)?.resolvedAt || report.timestamps?.updatedAt || 0).toLocaleString()}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/25">
                          Resolved
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </RouteGuard>
  );
}
