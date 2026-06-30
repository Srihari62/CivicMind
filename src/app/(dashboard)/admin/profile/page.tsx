/**
 * @file src/app/(dashboard)/admin/profile/page.tsx
 * @description Admin Profile and Command Settings Center.
 */

"use client";

import React, { useState, useEffect } from"react";
import { useAuth } from"@/providers/auth-provider";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { collection, onSnapshot } from"firebase/firestore";
import { db, COLLECTIONS } from"@/services/firebase/firestore";
import { CivicReport } from"@/types";
import { FirestoreUserProfile, UserRepository } from"@/features/auth/repositories/user.repository";
import { updatePasswordAction } from"@/app/actions/admin.actions";
import { MediaService } from"@/features/media/services/media.service";
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
} from"lucide-react";
import { motion, AnimatePresence } from"framer-motion";

export default function AdminProfilePage() {
 const { profile } = useAuth();
 
 // Local editable state
 const [name, setName] = useState("");
 const [phone, setPhone] = useState("");
 const [avatarUrl, setAvatarUrl] = useState("");
 const [preferredLanguage, setPreferredLanguage] = useState("en");
 const [adminState, setAdminState] = useState("");
 const [adminCity, setAdminCity] = useState("");
 
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
 const [toast, setToast] = useState<{ message: string; type:"success" |"error" } | null>(null);

 // Sync profile data
 useEffect(() => {
 if (profile) {
 setName(profile.displayName ||"");
 setPhone(profile.phone || profile.phoneNumber ||"");
 setAvatarUrl(profile.photoURL || profile.photo ||"");
 setPreferredLanguage(profile.preferredLanguage ||"en");
 setAdminState(profile.state ||"");
 setAdminCity(profile.city ||"");
 }
 }, [profile]);

 // Toast helper
 const showToast = (message: string, type:"success" |"error") => {
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
 preferredLanguage: preferredLanguage,
 state: adminState,
 city: adminCity,
 });

 showToast("Profile settings saved successfully.","success");
 } catch (err: any) {
 showToast(err?.message ||"Failed to save profile changes.","error");
 } finally {
 setSaving(false);
 }
 };

 // Separate Password change handler
 const handleUpdatePassword = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!profile?.uid) return;

 if (newPassword.trim() ==="") {
 showToast("Password cannot be blank.","error");
 return;
 }

 if (newPassword.length < 6) {
 showToast("Password must be at least 6 characters.","error");
 return;
 }

 if (newPassword !== confirmPassword) {
 showToast("Passwords do not match.","error");
 return;
 }

 setUpdatingPassword(true);
 try {
 const res = await updatePasswordAction(profile.uid, profile.uid, newPassword);
 if (res.success) {
 showToast("Security password updated successfully.","success");
 setNewPassword("");
 setConfirmPassword("");
 } else {
 showToast(res.error ||"Failed to update security password.","error");
 }
 } catch (err: any) {
 showToast(err?.message ||"Failed to update security password.","error");
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
 showToast("Profile picture uploaded successfully.","success");
 }
 } catch (err: any) {
 console.error("Avatar upload failed:", err);
 showToast(err.message ||"Failed to upload avatar image.","error");
 } finally {
 setUploadingAvatar(false);
 }
 };

 // Derive stats
 const totalReports = allReports.length;
 const totalOfficers = allUsers.filter((u) => u.role ==="officer").length;
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
 className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-full border text-xs font-bold shadow-lg backdrop-blur-md flex items-center gap-2 ${
 toast.type ==="success"
 ?"bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
 :"bg-rose-500/10 border-rose-500/30 text-rose-600"
 }`}
 >
 {toast.type ==="success" ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-550" />}
 {toast.message}
 </motion.div>
)}
 </AnimatePresence>

 {/* Page Header */}
 <div>
 <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">
 Command Profile Settings
 </h1>
 <p className="text-xs text-slate-500 mt-1">
 Configure administrator details, security credentials, and view system management statistics.
 </p>
 </div>

 <div className="flex flex-col lg:flex-row gap-6">
 {/* Left Side: Profile Edit & Security Forms */}
 <div className="flex-1 flex flex-col gap-6">
 {/* Card 1: Basic Profile Settings */}
 <form onSubmit={handleSave} className="bg-white/80 border border-slate-200 rounded-3xl p-6 backdrop-blur-md shadow-sm flex flex-col gap-5">
 <h2 className="text-xs font-black uppercase tracking-widest text-indigo-650 flex items-center gap-2 pb-2 border-b border-slate-100">
 <Settings className="h-4 w-4 text-indigo-600" /> Account Telemetry Settings
 </h2>

 {/* Profile Avatar Card */}
 <div className="flex flex-col md:flex-row gap-4 items-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
 <div className="relative w-16 h-16 rounded-full overflow-hidden border border-slate-350 shrink-0 bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-lg">
 {avatarUrl ? (
 /* eslint-disable-next-line @next/next/no-img-element */
 <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
) : (
 (name || profile?.email ||"A").charAt(0).toUpperCase()
)}
 {uploadingAvatar && (
 <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
 <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
 </div>
)}
 </div>
 <div className="flex-1 flex flex-col gap-1 w-full text-center md:text-left">
 <span className="text-xs font-black text-slate-800">Avatar & Identity Profile</span>
 <span className="text-[10px] text-slate-400">Supports JPG, PNG, WEBP. Directly uploads to Cloudinary storage.</span>
 <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
 <label className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm">
 <Camera className="w-3.5 h-3.5 text-slate-550" /> Upload Avatar Image
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
 UserRepository.updateUserProfile(profile.uid, { photoURL:"", photo:"" });
 showToast("Avatar image removed successfully.","success");
 }
 }}
 className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-[10px] h-8 font-bold rounded-xl"
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
 <label className="text-[10px] uppercase font-bold text-slate-400">Full Name</label>
 <Input
 required
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Admin Name"
 className="bg-slate-50 border-slate-200 text-xs h-9 text-slate-800 font-semibold rounded-xl focus:border-indigo-550"
 />
 </div>

 {/* Phone */}
 <div className="flex flex-col gap-1">
 <label className="text-[10px] uppercase font-bold text-slate-400">Phone Number</label>
 <Input
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 placeholder="+91..."
 className="bg-slate-50 border-slate-200 text-xs h-9 text-slate-800 font-semibold rounded-xl focus:border-indigo-550"
 />
 </div>

 {/* State */}
 <div className="flex flex-col gap-1">
 <label className="text-[10px] uppercase font-bold text-slate-400">Jurisdiction State</label>
 <Input
 value={adminState}
 onChange={(e) => setAdminState(e.target.value)}
 placeholder="State"
 className="bg-slate-50 border-slate-200 text-xs h-9 text-slate-800 font-semibold rounded-xl focus:border-indigo-550"
 />
 </div>

 {/* City */}
 <div className="flex flex-col gap-1">
 <label className="text-[10px] uppercase font-bold text-slate-400">Jurisdiction City</label>
 <Input
 value={adminCity}
 onChange={(e) => setAdminCity(e.target.value)}
 placeholder="City"
 className="bg-slate-50 border-slate-200 text-xs h-9 text-slate-800 font-semibold rounded-xl focus:border-indigo-550"
 />
 </div>

 {/* Preferred Language */}
 <div className="flex flex-col gap-1 md:col-span-2">
 <label className="text-[10px] uppercase font-bold text-slate-400">Preferred Language</label>
 <select
 value={preferredLanguage}
 onChange={(e) => setPreferredLanguage(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-9 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-550 cursor-pointer"
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

 {/* Profile Image URL */}
 <div className="flex flex-col gap-1 md:col-span-2">
 <label className="text-[10px] uppercase font-bold text-slate-400">Profile Image URL Link</label>
 <Input
 value={avatarUrl}
 onChange={(e) => setAvatarUrl(e.target.value)}
 placeholder="https://..."
 className="bg-slate-50 border-slate-200 text-xs h-9 text-slate-800 font-semibold rounded-xl focus:border-indigo-550"
 />
 </div>
 </div>

 <Button
 type="submit"
 disabled={saving}
 className="bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs uppercase tracking-widest px-6 h-11 w-fit mt-2 rounded-full shadow-lg"
 >
 {saving ?"Saving Telemetry Profile..." :"Save Profile Settings"}
 </Button>
 </form>

 {/* Card 2: Security & Password Overrides */}
 <form onSubmit={handleUpdatePassword} className="bg-white/80 border border-slate-200 rounded-3xl p-6 backdrop-blur-md shadow-sm flex flex-col gap-4">
 <h2 className="text-xs font-black uppercase tracking-widest text-indigo-650 flex items-center gap-2 pb-2 border-b border-slate-100">
 <Lock className="h-4 w-4 text-indigo-650" /> Security Credentials Override
 </h2>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* New Password */}
 <div className="flex flex-col gap-1">
 <label className="text-[10px] uppercase font-bold text-slate-400">New Password</label>
 <Input
 type="password"
 required
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 placeholder="Enter new password (min. 6 chars)"
 className="bg-slate-50 border-slate-200 text-xs h-9 text-slate-800 font-semibold rounded-xl focus:border-indigo-550"
 />
 </div>

 {/* Confirm Password */}
 <div className="flex flex-col gap-1">
 <label className="text-[10px] uppercase font-bold text-slate-400">Confirm Password</label>
 <Input
 type="password"
 required
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 placeholder="Re-enter password to verify"
 className="bg-slate-50 border-slate-200 text-xs h-9 text-slate-800 font-semibold rounded-xl focus:border-indigo-550"
 />
 </div>
 </div>

 <div className="flex items-center justify-between flex-wrap gap-4 mt-2">
 <Button
 type="submit"
 disabled={updatingPassword}
 className="bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs uppercase tracking-widest px-6 h-11 rounded-full shadow-lg"
 >
 {updatingPassword ?"Updating Password..." :"Update Security Password"}
 </Button>
 <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Bypasses client-side recent login check automatically.</span>
 </div>
 </form>

 {/* Admin Stats Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {/* Reports Managed */}
 <div className="bg-white/80 border border-slate-200 rounded-3xl p-5 flex flex-col gap-1 shadow-sm backdrop-blur-md">
 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Reports Managed</span>
 <span className="text-2xl font-black text-indigo-650 flex items-center gap-2 mt-1">
 <FileText className="h-5 w-5" /> {loadingStats ?"..." : totalReports}
 </span>
 </div>

 {/* Officers Managed */}
 <div className="bg-white/80 border border-slate-200 rounded-3xl p-5 flex flex-col gap-1 shadow-sm backdrop-blur-md">
 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Officers Managed</span>
 <span className="text-2xl font-black text-purple-650 flex items-center gap-2 mt-1">
 <Users className="h-5 w-5" /> {loadingStats ?"..." : totalOfficers}
 </span>
 </div>

 {/* Departments */}
 <div className="bg-white/80 border border-slate-200 rounded-3xl p-5 flex flex-col gap-1 shadow-sm backdrop-blur-md">
 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Departments</span>
 <span className="text-2xl font-black text-teal-650 flex items-center gap-2 mt-1">
 <Building className="h-5 w-5" /> {loadingStats ?"..." : distinctDepts}
 </span>
 </div>
 </div>

 {/* Placeholder Settings Section */}
 <div className="bg-white/40 border border-dashed border-slate-250 rounded-3xl p-6 flex flex-col gap-2">
 <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">System Preferences Placeholder</h3>
 <p className="text-[11px] text-slate-500">
 Future settings: configure Webhook notifications, audit Log retention periods, AI verification models threshold, and external map API overrides.
 </p>
 </div>
 </div>

 {/* Right Side: Timeline & Logs */}
 <div className="w-full lg:w-80 flex flex-col gap-6">
 {/* Metadata Card */}
 <div className="bg-white/80 border border-slate-200 rounded-3xl p-5 backdrop-blur-md shadow-sm flex flex-col gap-3">
 <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
 <Shield className="h-4 w-4 text-indigo-500" /> Command Info
 </h3>
 <div className="flex flex-col gap-2 text-xs">
 <div className="flex justify-between border-b border-slate-100 pb-1.5">
 <span className="text-slate-500">Joined Date</span>
 <span className="font-mono text-slate-700 font-bold">
 {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() :"—"}
 </span>
 </div>
 <div className="flex justify-between border-b border-slate-100 pb-1.5">
 <span className="text-slate-500">Last Active</span>
 <span className="font-mono text-slate-700 font-bold">
 {new Date().toLocaleDateString()}
 </span>
 </div>
 </div>
 </div>

 {/* Activity Timeline */}
 <div className="bg-white/80 border border-slate-200 rounded-3xl p-5 backdrop-blur-md shadow-sm flex flex-col gap-4">
 <h3 className="text-xs font-black uppercase tracking-wider text-indigo-650 flex items-center gap-2">
 <Activity className="h-4 w-4 text-indigo-600 animate-pulse" /> Telemetry Events
 </h3>

 {loadingStats ? (
 <div className="flex justify-center py-8">
 <Loader2 className="w-5 h-5 text-indigo-450 animate-spin" />
 </div>
) : timelineEvents.length === 0 ? (
 <div className="text-slate-400 text-xs text-center py-8 border border-dashed border-slate-200 rounded-2xl">
 No telemetry data available.
 </div>
) : (
 <div className="flex flex-col gap-4 overflow-y-auto max-h-[50vh] pr-1">
 {timelineEvents.map((event) => (
 <div key={event.id} className="relative pl-4 border-l border-slate-150 pb-3 last:pb-0 flex flex-col gap-0.5">
 {/* Dot */}
 <div className="absolute -left-1 top-1.5 w-2 h-2 rounded-full bg-indigo-600" />

 <div className="flex justify-between text-[9px] text-slate-400 font-mono font-bold">
 <span>{event.timestamps?.updatedAt ? new Date(event.timestamps.updatedAt).toLocaleTimeString() :"—"}</span>
 <span className="capitalize text-indigo-500">{event.status}</span>
 </div>
 <span className="font-extrabold text-[11px] text-slate-800 line-clamp-1">
 {event.ai?.assistant?.title || event.metadata.title}
 </span>
 <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">
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
