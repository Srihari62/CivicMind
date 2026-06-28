/**
 * @file src/app/(dashboard)/admin/profile/page.tsx
 * @description Admin Profile and Command Settings Center.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { collection, onSnapshot } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { CivicReport } from "@/types";
import { FirestoreUserProfile, UserRepository } from "@/features/auth/repositories/user.repository";
import { updatePasswordAction } from "@/app/actions/admin.actions";
import { MediaService } from "@/features/media/services/media.service";
import {
  Shield,
  CheckCircle,
  FileText,
  Calendar,
  Phone,
  Loader2,
  Sparkles,
  Users,
  Building,
  Key,
  Camera,
  Activity,
  ChevronRight,
  Settings,
  X,
  Lock,
  Upload
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminProfilePage() {
  const { profile } = useAuth();
  
  // Local editable state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // Password change states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  
  // Upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Stats & listings
  const [allReports, setAllReports] = useState<CivicReport[]>([]);
  const [allUsers, setAllUsers] = useState<FirestoreUserProfile[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<CivicReport[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Sync profile data
  useEffect(() => {
    if (profile) {
      setName(profile.displayName || "");
      setPhone(profile.phone || profile.phoneNumber || "");
      setAvatarUrl(profile.photoURL || profile.photo || "");
    }
  }, [profile]);

  // Toast helper
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Real-time listener for users & reports for analytics stats
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, COLLECTIONS.USERS), (snap) => {
      const uList: FirestoreUserProfile[] = [];
      snap.forEach((doc) => {
        uList.push({ uid: doc.id, ...doc.data() } as FirestoreUserProfile);
      });
      setAllUsers(uList);
    });

    const unsubReports = onSnapshot(collection(db, COLLECTIONS.REPORTS), (snap) => {
      const rList: CivicReport[] = [];
      snap.forEach((doc) => {
        rList.push({ id: doc.id, ...doc.data() } as CivicReport);
      });
      setAllReports(rList);
      
      // Sort reports by updatedAt to display latest as timeline events
      const sorted = [...rList].sort(
        (a, b) => new Date(b.timestamps?.updatedAt || 0).getTime() - new Date(a.timestamps?.updatedAt || 0).getTime()
      );
      setTimelineEvents(sorted.slice(0, 5));
      setLoadingStats(false);
    });

    return () => {
      unsubUsers();
      unsubReports();
    };
  }, []);

  // Save changes handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setSaving(true);

    try {
      // Update basic profile info
      await UserRepository.updateUserProfile(profile.uid, {
        displayName: name,
        phone: phone,
        phoneNumber: phone,
        photoURL: avatarUrl,
        photo: avatarUrl,
      });

      showToast("Profile settings saved successfully.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to save profile changes.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Separate Password change handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;

    if (newPassword.trim() === "") {
      showToast("Password cannot be blank.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await updatePasswordAction(profile.uid, profile.uid, newPassword);
      if (res.success) {
        showToast("Security password updated successfully.", "success");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showToast(res.error || "Failed to update security password.", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to update security password.", "error");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Profile picture upload handler
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
        // Auto save profile image URL in firestore profile
        await UserRepository.updateUserProfile(profile.uid, {
          photoURL: newUrl,
          photo: newUrl
        });
        showToast("Profile picture uploaded successfully.", "success");
      }
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      showToast(err.message || "Failed to upload avatar image.", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Derive stats
  const totalReports = allReports.length;
  const totalOfficers = allUsers.filter((u) => u.role === "officer").length;
  const distinctDepts = Array.from(
    new Set(allUsers.map((u) => u.department).filter(Boolean))
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border text-sm font-semibold shadow-lg backdrop-blur-md flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Command Profile Settings
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configure administrator details, security credentials, and view system management statistics.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Profile Edit & Security Forms */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Card 1: Basic Profile Settings */}
          <form onSubmit={handleSave} className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col gap-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-red-450 flex items-center gap-2 pb-2 border-b border-white/5">
              <Settings className="h-4 w-4 text-red-400" /> Account Telemetry Settings
            </h2>

            {/* Profile Avatar Card */}
            <div className="flex flex-col md:flex-row gap-4 items-center p-4 bg-zinc-900/40 border border-white/5 rounded-xl">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/10 shrink-0 bg-zinc-950 flex items-center justify-center font-bold text-zinc-400 text-lg">
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (name || profile?.email || "A").charAt(0).toUpperCase()
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col gap-1 w-full">
                <span className="text-xs font-semibold text-zinc-350">Avatar & Identity Profile</span>
                <span className="text-[10px] text-zinc-500">Supports JPG, PNG, WEBP. Directly uploads to Cloudinary storage.</span>
                <div className="flex items-center gap-2 mt-1">
                  <label className="bg-zinc-850 hover:bg-zinc-800 text-zinc-350 border border-white/10 text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors">
                    <Camera className="w-3.5 h-3.5 text-zinc-450" /> Upload Avatar Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                  </label>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAvatarUrl("");
                        if (profile?.uid) {
                          UserRepository.updateUserProfile(profile.uid, { photoURL: "", photo: "" });
                          showToast("Avatar image removed successfully.", "success");
                        }
                      }}
                      className="text-red-400 hover:text-red-300 border border-red-500/10 text-[10px] h-7 font-bold"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-zinc-450">Full Name</label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Admin Name"
                  className="bg-black/45 border-white/10 text-xs h-9 text-zinc-150 font-semibold"
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-zinc-450">Phone Number</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                  className="bg-black/45 border-white/10 text-xs h-9 text-zinc-150 font-semibold"
                />
              </div>

              {/* Profile Image URL */}
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] uppercase font-bold text-zinc-450">Profile Image URL Link</label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-black/45 border-white/10 text-xs h-9 text-zinc-150 font-semibold"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="bg-red-500 hover:bg-red-650 text-white font-extrabold text-xs uppercase tracking-widest px-6 h-10 w-fit mt-2"
            >
              {saving ? "Saving Telemetry Profile..." : "Save Profile Settings"}
            </Button>
          </form>

          {/* Card 2: Security & Password Overrides */}
          <form onSubmit={handleUpdatePassword} className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col gap-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-2 pb-2 border-b border-white/5">
              <Lock className="h-4 w-4 text-amber-400" /> Security Credentials Override
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New Password */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-zinc-450">New Password</label>
                <Input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 chars)"
                  className="bg-black/45 border-white/10 text-xs h-9 text-zinc-150 font-semibold"
                />
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-zinc-450">Confirm Password</label>
                <Input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password to verify"
                  className="bg-black/45 border-white/10 text-xs h-9 text-zinc-150 font-semibold"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={updatingPassword}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs uppercase tracking-widest px-6 h-10 w-fit mt-2"
            >
              {updatingPassword ? "Updating Password..." : "Update Security Password"}
            </Button>
            <span className="text-[9px] text-zinc-550 font-medium">Bypasses client-side recent login check automatically.</span>
          </form>

          {/* Admin Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Reports Managed */}
            <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-4 flex flex-col gap-1 shadow-lg backdrop-blur-sm">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Reports Managed</span>
              <span className="text-2xl font-black text-red-400 flex items-center gap-2 mt-1">
                <FileText className="h-5 w-5" /> {loadingStats ? "..." : totalReports}
              </span>
            </div>

            {/* Officers Managed */}
            <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-4 flex flex-col gap-1 shadow-lg backdrop-blur-sm">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Officers Managed</span>
              <span className="text-2xl font-black text-blue-400 flex items-center gap-2 mt-1">
                <Users className="h-5 w-5" /> {loadingStats ? "..." : totalOfficers}
              </span>
            </div>

            {/* Departments */}
            <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-4 flex flex-col gap-1 shadow-lg backdrop-blur-sm">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Departments</span>
              <span className="text-2xl font-black text-emerald-400 flex items-center gap-2 mt-1">
                <Building className="h-5 w-5" /> {loadingStats ? "..." : distinctDepts}
              </span>
            </div>
          </div>

          {/* Placeholder Settings Section */}
          <div className="bg-zinc-900/10 border border-dashed border-white/5 rounded-xl p-6 flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">System Preferences Placeholder</h3>
            <p className="text-[11px] text-zinc-500">
              Future settings: configure Webhook notifications, audit Log retention periods, AI verification models threshold, and external map API overrides.
            </p>
          </div>
        </div>

        {/* Right Side: Timeline & Logs */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          {/* Metadata Card */}
          <div className="bg-zinc-900/20 border border-white/5 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-zinc-500" /> Command Info
            </h3>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-zinc-500">Joined Date</span>
                <span className="font-mono text-zinc-300">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-zinc-500">Last Active</span>
                <span className="font-mono text-zinc-300">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-zinc-900/20 border border-white/5 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col gap-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-red-450 flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-400 animate-pulse" /> Telemetry Events
            </h3>

            {loadingStats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
              </div>
            ) : timelineEvents.length === 0 ? (
              <div className="text-zinc-500 text-xs text-center py-8 border border-dashed border-white/5 rounded-xl">
                No telemetry data available.
              </div>
            ) : (
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[50vh] pr-1">
                {timelineEvents.map((event) => (
                  <div key={event.id} className="relative pl-4 border-l border-white/10 pb-3 last:pb-0 flex flex-col gap-0.5">
                    {/* Dot */}
                    <div className="absolute -left-1 top-1.5 w-2 h-2 rounded-full bg-red-500" />

                    <div className="flex justify-between text-[9px] text-zinc-500 font-mono font-bold">
                      <span>{event.timestamps?.updatedAt ? new Date(event.timestamps.updatedAt).toLocaleTimeString() : "—"}</span>
                      <span className="capitalize text-red-400/90">{event.status}</span>
                    </div>
                    <span className="font-bold text-[11px] text-zinc-300 line-clamp-1">
                      {event.ai?.assistant?.title || event.metadata.title}
                    </span>
                    <p className="text-[10px] text-zinc-500 leading-normal line-clamp-2">
                      {event.ai?.assistant?.description || event.metadata.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
