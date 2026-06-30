/**
 * @file src/app/(dashboard)/officer/profile/page.tsx
 * @description Officer profile page containing workload stats and profile modification forms.
 */

"use client";

import React, { useState, useEffect } from"react";
import { useAuth } from"@/providers/auth-provider";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { doc, onSnapshot, collection, query, where, getDocs } from"firebase/firestore";
import { db, COLLECTIONS } from"@/services/firebase/firestore";
import { FirestoreUserProfile, UserRepository } from"@/features/auth/repositories/user.repository";
import { updatePasswordAction } from"@/app/actions/admin.actions";
import { MediaService } from"@/features/media/services/media.service";
import { CivicReport } from"@/types";
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
 AlertTriangle,
 Sparkles
} from"lucide-react";
import { motion, AnimatePresence } from"framer-motion";

export const dynamic ="force-dynamic";

export default function OfficerProfilePage() {
 const { profile } = useAuth();
 const [userProfile, setUserProfile] = useState<FirestoreUserProfile | null>(null);

 // Form State
 const [name, setName] = useState("");
 const [phone, setPhone] = useState("");
 const [availability, setAvailability] = useState<"available" |"busy" |"offline">("available");
 const [zone, setZone] = useState("");
 const [emergencyContact, setEmergencyContact] = useState("");
 const [bio, setBio] = useState("");
 const [avatarUrl, setAvatarUrl] = useState("");
 const [preferredLanguage, setPreferredLanguage] = useState("en");
 const [officerState, setOfficerState] = useState("");
 const [officerCity, setOfficerCity] = useState("");

 // Password Form State
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [updatingPassword, setUpdatingPassword] = useState(false);

 // Upload/Saving State
 const [uploadingAvatar, setUploadingAvatar] = useState(false);
 const [savingProfile, setSavingProfile] = useState(false);
 const [toast, setToast] = useState<{ message: string; type:"success" |"error" } | null>(null);

 // Statistics State
 const [assignedCount, setAssignedCount] = useState(0);
 const [completedCount, setCompletedCount] = useState(0);
 const [activeCount, setActiveCount] = useState(0);
 const [avgResolutionTime, setAvgResolutionTime] = useState("3.2h");
 const [citizenRating, setCitizenRating] = useState(4.8);
 const [performanceScore, setPerformanceScore] = useState(96);
 const [points, setPoints] = useState(0);
 const [pointsHistory, setPointsHistory] = useState<any[]>([]);
 const [loadingPointsHistory, setLoadingPointsHistory] = useState(false);
 const [showPointsModal, setShowPointsModal] = useState(false);

 // Sync profile data and setup real-time listener
 useEffect(() => {
 if (!profile?.uid) return;

 // Real-time listener for the officer's profile
 const unsub = onSnapshot(doc(db, COLLECTIONS.USERS, profile.uid), (docSnap) => {
 if (docSnap.exists()) {
 const data = docSnap.data() as FirestoreUserProfile;
 setUserProfile(data);
 setName(data.displayName ||"");
 setPhone(data.phone || data.phoneNumber ||"");
 setAvailability(data.availability ||"available");
 setZone(data.zone ||"");
 setEmergencyContact(data.emergencyContact ||"");
 setBio(data.bio ||"");
 setAvatarUrl(data.photoURL || data.photo ||"");
 setPreferredLanguage(data.preferredLanguage ||"en");
 setOfficerState(data.state ||"");
 setOfficerCity(data.city ||"");
 setPoints((data as any).gamification?.points || 0);

 // Load stats from profile if they exist
 if (data.activeCases !== undefined) setActiveCount(data.activeCases);
 if (data.completedCases !== undefined) setCompletedCount(data.completedCases);
 }
 });

 // Real-time listener for reports to calculate dynamic metrics
 const unsubReports = onSnapshot(
 query(collection(db, COLLECTIONS.REPORTS), where("city","==", profile.city ||"")),
 (snap) => {
 let assigned = 0;
 let completed = 0;
 let active = 0;

 snap.forEach((docSnap) => {
 const report = docSnap.data() as CivicReport;
 const isMyOfficer = report.ai?.assignment?.officerId === profile.uid;
 const isMyDept = profile.department && report.ai?.assignment?.department?.toLowerCase() === profile.department.toLowerCase();

 if (isMyOfficer || isMyDept) {
 if (["submitted","assigned","accepted","travelling","investigation_started","in_progress","pending_verification"].includes(report.status)) {
 assigned++;
 if (report.status ==="in_progress") {
 active++;
 }
 } else if (["resolved","closed"].includes(report.status)) {
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
 }, [profile?.uid, profile?.department, profile?.city]);

 useEffect(() => {
 if (!profile?.uid || !showPointsModal) return;

 setLoadingPointsHistory(true);
 const fetchHistory = async () => {
 try {
 const q = query(collection(db,"users", profile.uid,"pointsTransactions"));
 const snap = await getDocs(q);
 const items: any[] = [];
 snap.forEach((docSnap) => {
 items.push({ id: docSnap.id, ...docSnap.data() });
 });

 // Sort by timestamp desc
 items.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

 // Derived fallback if empty
 if (items.length === 0 && completedCount > 0) {
 for (let i = 0; i < completedCount; i++) {
 items.push({
 id: `derived-resolved-${i}`,
 points: 100,
 action:"resolve",
 timestamp: new Date().toISOString(),
 description:"Report Resolved (+100 Solver Points)",
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
 }, [profile?.uid, showPointsModal, completedCount]);

 const showToast = (message: string, type:"success" |"error") => {
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
 preferredLanguage: preferredLanguage,
 state: officerState,
 city: officerCity,
 });
 showToast("Profile updated successfully.","success");
 } catch (err: any) {
 showToast(err?.message ||"Failed to update profile.","error");
 } finally {
 setSavingProfile(false);
 }
 };

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
 showToast("Password updated successfully.","success");
 setNewPassword("");
 setConfirmPassword("");
 } else {
 showToast(res.error ||"Failed to update password.","error");
 }
 } catch (err: any) {
 showToast(err?.message ||"Failed to update password.","error");
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
 showToast("Profile picture uploaded successfully.","success");
 }
 } catch (err: any) {
 console.error("Avatar upload failed:", err);
 showToast(err.message ||"Failed to upload avatar image.","error");
 } finally {
 setUploadingAvatar(false);
 }
 };

 return (
 <div className="max-w-6xl w-[92%] mx-auto px-0 py-6 flex flex-col gap-8 relative z-10">
 {/* Toast Notification */}
 <AnimatePresence>
 {toast && (
 <motion.div
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 className={`fixed top-24 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-full border shadow-xl backdrop-blur-md ${
 toast.type ==="success"
 ?"bg-emerald-50 border-emerald-500/35 text-emerald-700"
 :"bg-rose-5:0 border-rose-500/35 text-rose-705"
 }`}
 >
 {toast.type ==="success" ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
 <span className="text-xs font-bold">{toast.message}</span>
 </motion.div>
)}
 </AnimatePresence>

 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex flex-col gap-1">
 <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
 Officer Profile & <span className="text-orange-600">Credentials</span>
 </h1>
 <p className="text-sm text-slate-500">
 Manage your service availability, coordinate contact information, and review field metrics.
 </p>
 </div>
 </div>

 {/* Profile Overview Header Card */}
 <div className="clay-card p-8 flex flex-col md:flex-row gap-8 items-center relative overflow-hidden">
 {/* Avatar Area */}
 <div className="relative group">
 <div className="relative h-28 w-28 rounded-full overflow-hidden border-2 border-orange-500/40 bg-orange-500/10 flex items-center justify-center shadow-md">
 {avatarUrl ? (
 /* eslint-disable-next-line @next/next/no-img-element */
 <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
) : (
 <User className="h-12 w-12 text-orange-500" />
)}
 {uploadingAvatar && (
 <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
 <Loader2 className="h-6 w-6 text-orange-400 animate-spin" />
 </div>
)}
 </div>
 <label className="absolute bottom-0 right-0 p-2 bg-orange-600 hover:bg-orange-500 text-white rounded-full cursor-pointer shadow-lg transition-transform group-hover:scale-110">
 <Camera className="h-4 w-4" />
 <input type="file" onChange={handleAvatarUpload} className="hidden" accept="image/*" disabled={uploadingAvatar} />
 </label>
 </div>

 <div className="flex-1 flex flex-col gap-4 text-center md:text-left">
 <div className="flex flex-col gap-1">
 <h2 className="text-2xl font-bold text-slate-850">{name ||"Official Officer"}</h2>
 <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1.5">
 <span className="text-xs font-mono bg-orange-500/10 text-orange-600 px-2.5 py-0.5 rounded-full border border-orange-500/20 font-bold flex items-center gap-1">
 <Shield className="h-3.5 w-3.5" />
 {userProfile?.department ||"Department Staff"}
 </span>
 <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200 font-semibold flex items-center gap-1">
 ID: {userProfile?.employeeId ||"OFFICER-GEN"}
 </span>
 {zone && (
 <span className="text-xs font-mono bg-blue-500/10 text-blue-600 px-2.5 py-0.5 rounded-full border border-blue-500/20 font-bold flex items-center gap-1">
 <MapPin className="h-3.5 w-3.5" />
 Zone: {zone}
 </span>
)}
 </div>
 </div>
 {bio && <p className="text-sm text-slate-500 max-w-2xl">{bio}</p>}
 </div>
 </div>

 {/* Grid of stats */}
 <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
 <div className="clay-card p-4 text-center flex flex-col justify-center items-center">
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Assigned</span>
 <p className="text-xl font-black text-slate-800 mt-1">{assignedCount}</p>
 </div>
 <div className="clay-card p-4 text-center flex flex-col justify-center items-center">
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Completed</span>
 <p className="text-xl font-black text-slate-800 mt-1">{completedCount}</p>
 </div>
 <div className="clay-card p-4 text-center flex flex-col justify-center items-center">
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Active</span>
 <p className="text-xl font-black text-slate-800 mt-1">{activeCount}</p>
 </div>
 <div className="clay-card p-4 text-center flex flex-col justify-center items-center">
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Avg Res. Time</span>
 <p className="text-xl font-black text-slate-800 mt-1 flex items-center justify-center gap-1">
 <Calendar className="h-4 w-4 text-orange-500" />
 {avgResolutionTime}
 </p>
 </div>
 <div className="clay-card p-4 text-center flex flex-col justify-center items-center">
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Rating</span>
 <p className="text-xl font-black text-slate-800 mt-1 flex items-center justify-center gap-1">
 <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
 {citizenRating}
 </p>
 </div>
 <div className="clay-card p-4 text-center flex flex-col justify-center items-center">
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Score</span>
 <p className="text-xl font-black text-slate-800 mt-1 flex items-center justify-center gap-1">
 <Zap className="h-4 w-4 text-emerald-500" />
 {performanceScore}%
 </p>
 </div>
 <div 
 onClick={() => setShowPointsModal(true)}
 className="clay-card p-4 text-center cursor-pointer hover:shadow-lg transition-all group flex flex-col justify-center items-center bg-orange-500/5 border border-orange-500/20"
 >
 <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wide flex items-center justify-center gap-1">
 <Award className="h-3.5 w-3.5 text-orange-500" />
 Solver PTS
 </span>
 <p className="text-xl font-black text-slate-800 mt-1 group-hover:text-orange-600 transition-colors">
 {points}
 </p>
 <span className="text-[9px] text-slate-400 block mt-0.5">View History</span>
 </div>
 </div>

 {/* Main Settings Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Profile update form card */}
 <div className="lg:col-span-2 clay-card p-8 flex flex-col gap-6">
 <div>
 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
 <User className="h-5 w-5 text-orange-500" />
 General Details
 </h3>
 <p className="text-xs text-slate-450 mt-1">Configure your personal information and contact points.</p>
 </div>

 <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 <div className="flex flex-col gap-1.5">
 <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Full Name</label>
 <Input value={name} onChange={(e) => setName(e.target.value)} required className="bg-white border-slate-200 text-slate-800 focus:border-orange-500/50 rounded-2xl shadow-inner" />
 </div>
 <div className="flex flex-col gap-1.5">
 <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Phone Number</label>
 <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white border-slate-200 text-slate-800 focus:border-orange-500/50 rounded-2xl shadow-inner" />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 <div className="flex flex-col gap-1.5">
 <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Department (Read-only)</label>
 <Input value={userProfile?.department ||""} disabled className="bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed font-semibold rounded-2xl shadow-inner" />
 </div>
 <div className="flex flex-col gap-1.5">
 <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Zone Location</label>
 <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="e.g. Zone A, Downtown" className="bg-white border-slate-200 text-slate-800 focus:border-orange-500/50 rounded-2xl shadow-inner" />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 <div className="flex flex-col gap-1.5">
 <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">State</label>
 <Input value={officerState} onChange={(e) => setOfficerState(e.target.value)} placeholder="State" className="bg-white border-slate-200 text-slate-800 focus:border-orange-500/50 rounded-2xl shadow-inner" />
 </div>
 <div className="flex flex-col gap-1.5">
 <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">City</label>
 <Input value={officerCity} onChange={(e) => setOfficerCity(e.target.value)} placeholder="City" className="bg-white border-slate-200 text-slate-800 focus:border-orange-500/50 rounded-2xl shadow-inner" />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 <div className="flex flex-col gap-1.5">
 <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Duty Status</label>
 <div className="relative bg-white border border-slate-200 rounded-2xl shadow-inner px-3 py-2 text-sm text-slate-850 focus-within:border-orange-500/50">
 <select
 value={availability}
 onChange={(e) => setAvailability(e.target.value as any)}
 className="w-full bg-transparent focus:outline-none capitalize font-bold cursor-pointer"
 >
 <option value="available" className="">Available</option>
 <option value="busy" className="">Busy</option>
 <option value="offline" className="">Offline</option>
 </select>
 </div>
 </div>
 <div className="flex flex-col gap-1.5">
 <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Preferred Language</label>
 <div className="relative bg-white border border-slate-200 rounded-2xl shadow-inner px-3 py-2 text-sm text-slate-850 focus-within:border-orange-500/50">
 <select
 value={preferredLanguage}
 onChange={(e) => setPreferredLanguage(e.target.value)}
 className="w-full bg-transparent focus:outline-none font-bold cursor-pointer"
 >
 <option value="English" className="">English</option>
 <option value="Hindi" className="">Hindi</option>
 <option value="Telugu" className="">Telugu</option>
 <option value="Tamil" className="">Tamil</option>
 <option value="Kannada" className="">Kannada</option>
 <option value="Malayalam" className="">Malayalam</option>
 <option value="Marathi" className="">Marathi</option>
 <option value="Gujarati" className="">Gujarati</option>
 <option value="Punjabi" className="">Punjabi</option>
 <option value="Bengali" className="">Bengali</option>
 <option value="Odia" className="">Odia</option>
 <option value="Urdu" className="">Urdu</option>
 </select>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 <div className="flex flex-col gap-1.5">
 <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Emergency Contact</label>
 <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Name / Phone" className="bg-white border-slate-200 text-slate-800 focus:border-orange-500/50 rounded-2xl shadow-inner" />
 </div>
 <div className="flex flex-col gap-1.5">
 {/* Empty cell */}
 </div>
 </div>

 <div className="flex flex-col gap-1.5">
 <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Bio / About Me</label>
 <textarea
 value={bio}
 onChange={(e) => setBio(e.target.value)}
 rows={3}
 placeholder="A brief overview of your service experience, specialties..."
 className="w-full bg-white border border-slate-200 text-slate-850 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded-2xl p-3 text-sm resize-none shadow-inner"
 />
 </div>

 <Button type="submit" disabled={savingProfile} className="bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-full px-6 py-2 self-start mt-2 shadow-md">
 {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
 Save Changes
 </Button>
 </form>
 </div>

 {/* Security / Password Card */}
 <div className="clay-card p-8 flex flex-col gap-6 self-start">
 <div>
 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
 <Lock className="h-5 w-5 text-orange-500" />
 Security Settings
 </h3>
 <p className="text-xs text-slate-450 mt-1">Configure credentials for secure console authentication.</p>
 </div>

 <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
 <div className="flex flex-col gap-1.5">
 <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">New Password</label>
 <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" className="bg-white border-slate-200 text-slate-850 focus:border-orange-500/50 rounded-2xl shadow-inner" />
 </div>
 <div className="flex flex-col gap-1.5">
 <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Confirm Password</label>
 <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-white border-slate-200 text-slate-850 focus:border-orange-500/50 rounded-2xl shadow-inner" />
 </div>

 <Button type="submit" disabled={updatingPassword} className="bg-orange-500/10 hover:bg-orange-500 text-orange-600 hover:text-white border border-orange-500/20 hover:border-transparent font-bold rounded-full mt-2 transition-all">
 {updatingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
 Update Password
 </Button>
 </form>
 </div>
 </div>

 {/* Solver Points History Modal */}
 <AnimatePresence>
 {showPointsModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 className="relative w-full max-w-lg clay-card p-6 flex flex-col gap-4 max-h-[85vh] overflow-hidden"
 >
 <div className="flex items-center justify-between border-b border-slate-100 pb-4">
 <div className="flex items-center gap-2">
 <Sparkles className="w-5 h-5 text-orange-550" />
 <h2 className="text-lg font-extrabold text-slate-850">Solver Points Ledger</h2>
 </div>
 <button
 onClick={() => setShowPointsModal(false)}
 className="text-slate-500 hover:bg-slate-100 transition text-xs font-bold px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200"
 >
 Close
 </button>
 </div>

 <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
 {loadingPointsHistory ? (
 <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
 <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
 <span className="text-xs font-bold">Retrieving points ledger...</span>
 </div>
) : pointsHistory.length === 0 ? (
 <div className="text-center py-12 text-slate-400 text-xs font-bold">
 No transactions found. Points are earned by successfully resolving reports.
 </div>
) : (
 pointsHistory.map((item) => (
 <div
 key={item.id}
 className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-100 transition flex items-center justify-between gap-4"
 >
 <div className="min-w-0">
 <h4 className="font-extrabold text-sm text-slate-850">
 {item.description ||"Report Resolved"}
 </h4>
 <p className="text-[10px] text-slate-400 font-mono mt-1">
 Date: {new Date(item.timestamp).toLocaleString()}
 </p>
 </div>
 <span className={`text-xs font-black font-mono shrink-0 px-2.5 py-1 rounded-lg ${
 item.points >= 0
 ?"text-emerald-600 bg-emerald-500/10 border border-emerald-500/25"
 :"text-rose-600 bg-rose-500/10 border border-rose-500/25"
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
 </div>
);
}
