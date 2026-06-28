/**
 * @file src/app/(dashboard)/officer/profile/page.tsx
 * @description Officer profile page containing workload stats and profile modification forms.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { FirestoreUserProfile, UserRepository } from "@/features/auth/repositories/user.repository";
import { updatePasswordAction } from "@/app/actions/admin.actions";
import { MediaService } from "@/features/media/services/media.service";
import { CivicReport } from "@/types";
import {
  User,
  Shield,
  Phone,
  Calendar,
  Lock,
  Camera,
  Activity,
  Award,
  Star,
  Zap,
  MapPin,
  Mail,
  Loader2,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const dynamic = "force-dynamic";

export default function OfficerProfilePage() {
  const { profile } = useAuth();
  const [userProfile, setUserProfile] = useState<FirestoreUserProfile | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [availability, setAvailability] = useState<"available" | "busy" | "offline">("available");
  const [zone, setZone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Password Form State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Upload/Saving State
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Statistics State
  const [assignedCount, setAssignedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [avgResolutionTime, setAvgResolutionTime] = useState("3.2h");
  const [citizenRating, setCitizenRating] = useState(4.8);
  const [performanceScore, setPerformanceScore] = useState(96);

  // Sync profile data and setup real-time listener
  useEffect(() => {
    if (!profile?.uid) return;

    // Real-time listener for the officer's profile
    const unsub = onSnapshot(doc(db, COLLECTIONS.USERS, profile.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as FirestoreUserProfile;
        setUserProfile(data);
        setName(data.displayName || "");
        setPhone(data.phone || data.phoneNumber || "");
        setAvailability(data.availability || "available");
        setZone(data.zone || "");
        setEmergencyContact(data.emergencyContact || "");
        setBio(data.bio || "");
        setAvatarUrl(data.photoURL || data.photo || "");

        // Load stats from profile if they exist
        if (data.activeCases !== undefined) setActiveCount(data.activeCases);
        if (data.completedCases !== undefined) setCompletedCount(data.completedCases);
      }
    });

    // Real-time listener for reports to calculate dynamic metrics
    const unsubReports = onSnapshot(collection(db, COLLECTIONS.REPORTS), (snap) => {
      let assigned = 0;
      let completed = 0;
      let active = 0;

      snap.forEach((docSnap) => {
        const report = docSnap.data() as CivicReport;
        const isMyOfficer = report.ai?.assignment?.officerId === profile.uid;
        const isMyDept = profile.department && report.ai?.assignment?.department?.toLowerCase() === profile.department.toLowerCase();

        if (isMyOfficer || isMyDept) {
          if (["submitted", "assigned", "accepted", "travelling", "investigation_started", "in_progress", "pending_verification"].includes(report.status)) {
            assigned++;
            if (report.status === "in_progress") {
              active++;
            }
          } else if (["resolved", "closed"].includes(report.status)) {
            completed++;
          }
        }
      });

      setAssignedCount(assigned);
      setCompletedCount(completed);
      setActiveCount(active);
    });

    return () => {
      unsub();
      unsubReports();
    };
  }, [profile?.uid, profile?.department]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setSavingProfile(true);

    try {
      await UserRepository.updateUserProfile(profile.uid, {
        displayName: name,
        phone: phone,
        phoneNumber: phone,
        availability: availability,
        zone: zone,
        emergencyContact: emergencyContact,
        bio: bio,
        photoURL: avatarUrl,
        photo: avatarUrl,
      });
      showToast("Profile updated successfully.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to update profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

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
        showToast("Password updated successfully.", "success");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showToast(res.error || "Failed to update password.", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to update password.", "error");
    } finally {
      setUpdatingPassword(false);
    }
  };

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
        await UserRepository.updateUserProfile(profile.uid, {
          photoURL: newUrl,
          photo: newUrl,
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

  return (
    <div className="max-w-7xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md ${
              toast.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/35 text-emerald-350"
                : "bg-rose-950/80 border-rose-500/35 text-rose-350"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 to-slate-350 bg-clip-text text-transparent">
            Officer Profile & Credentials
          </h1>
          <p className="text-sm text-slate-400">
            Manage your service availability, coordinate contact information, and review field metrics.
          </p>
        </div>
      </div>

      {/* Profile Overview Header Card */}
      <div className="relative overflow-hidden border border-slate-800/80 rounded-3xl bg-slate-950/30 p-8 backdrop-blur-sm flex flex-col md:flex-row gap-8 items-center">
        {/* Avatar Area */}
        <div className="relative group">
          <div className="relative h-28 w-28 rounded-full overflow-hidden border-2 border-indigo-500/40 bg-indigo-500/10 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-12 w-12 text-indigo-400" />
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
              </div>
            )}
          </div>
          <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full cursor-pointer shadow-lg transition-transform group-hover:scale-110">
            <Camera className="h-4 w-4" />
            <input type="file" onChange={handleAvatarUpload} className="hidden" accept="image/*" disabled={uploadingAvatar} />
          </label>
        </div>

        <div className="flex-1 flex flex-col gap-4 text-center md:text-left">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-slate-50">{name || "Official Officer"}</h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1.5">
              <span className="text-xs font-mono bg-indigo-500/10 text-indigo-300 px-2.5 py-0.5 rounded border border-indigo-500/20 font-bold flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                {userProfile?.department || "Department Staff"}
              </span>
              <span className="text-xs font-mono bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded border border-slate-800 font-semibold flex items-center gap-1">
                ID: {userProfile?.employeeId || "OFFICER-GEN"}
              </span>
              {zone && (
                <span className="text-xs font-mono bg-blue-500/10 text-blue-300 px-2.5 py-0.5 rounded border border-blue-500/20 font-bold flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Zone: {zone}
                </span>
              )}
            </div>
          </div>
          {bio && <p className="text-sm text-slate-400 max-w-2xl">{bio}</p>}
        </div>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="border border-slate-850 rounded-2xl bg-slate-950/40 p-4 text-center">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Assigned Cases</span>
          <p className="text-2xl font-black text-slate-200 mt-1">{assignedCount}</p>
        </div>
        <div className="border border-slate-850 rounded-2xl bg-slate-950/40 p-4 text-center">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Completed Cases</span>
          <p className="text-2xl font-black text-slate-200 mt-1">{completedCount}</p>
        </div>
        <div className="border border-slate-850 rounded-2xl bg-slate-950/40 p-4 text-center">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Cases</span>
          <p className="text-2xl font-black text-slate-200 mt-1">{activeCount}</p>
        </div>
        <div className="border border-slate-850 rounded-2xl bg-slate-950/40 p-4 text-center">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Res. Time</span>
          <p className="text-2xl font-black text-slate-200 mt-1 flex items-center justify-center gap-1">
            <Calendar className="h-4 w-4 text-indigo-400" />
            {avgResolutionTime}
          </p>
        </div>
        <div className="border border-slate-850 rounded-2xl bg-slate-950/40 p-4 text-center">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Citizen Rating</span>
          <p className="text-2xl font-black text-slate-200 mt-1 flex items-center justify-center gap-1">
            <Star className="h-4 w-4 text-amber-400 fill-amber-450" />
            {citizenRating}
          </p>
        </div>
        <div className="border border-slate-850 rounded-2xl bg-slate-950/40 p-4 text-center">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Performance Score</span>
          <p className="text-2xl font-black text-slate-200 mt-1 flex items-center justify-center gap-1">
            <Zap className="h-4 w-4 text-emerald-405" />
            {performanceScore}%
          </p>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile update form card */}
        <div className="lg:col-span-2 border border-slate-800 bg-slate-950/40 rounded-3xl p-8 flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-400" />
              General Details
            </h3>
            <p className="text-xs text-slate-450 mt-1">Configure your personal information and contact points.</p>
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Full Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required className="bg-slate-900 border-slate-800 text-slate-250 focus:border-indigo-500/50" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Phone Number</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-slate-900 border-slate-800 text-slate-250 focus:border-indigo-500/50" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Department (Read-only)</label>
                <Input value={userProfile?.department || ""} disabled className="bg-slate-900/40 border-slate-800 text-slate-450 cursor-not-allowed font-medium" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Zone Location</label>
                <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="e.g. Zone A, Downtown" className="bg-slate-900 border-slate-800 text-slate-250 focus:border-indigo-500/50" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Duty Status</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-250 focus:outline-none focus:border-indigo-500/50 capitalize"
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Emergency Contact</label>
                <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Name / Phone" className="bg-slate-900 border-slate-800 text-slate-250 focus:border-indigo-500/50" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Bio / About Me</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="A brief overview of your service experience, specialties..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-slate-250 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>

            <Button type="submit" disabled={savingProfile} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold self-start mt-2">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </form>
        </div>

        {/* Security / Password Card */}
        <div className="border border-slate-800 bg-slate-950/40 rounded-3xl p-8 flex flex-col gap-6 self-start">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-400" />
              Security Settings
            </h3>
            <p className="text-xs text-slate-450 mt-1">Configure credentials for secure console authentication.</p>
          </div>

          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">New Password</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" className="bg-slate-900 border-slate-800 text-slate-250 focus:border-indigo-500/50" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Confirm Password</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-slate-900 border-slate-800 text-slate-250 focus:border-indigo-500/50" />
            </div>

            <Button type="submit" disabled={updatingPassword} className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 hover:border-transparent font-bold mt-2">
              {updatingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
