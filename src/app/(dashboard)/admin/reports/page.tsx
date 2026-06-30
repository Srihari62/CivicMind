/**
 * @file src/app/(dashboard)/admin/reports/page.tsx
 * @description Admin Incident Registry list page.
 */

"use client";

import React, { useEffect, useState } from"react";
import { useAuth } from"@/providers/auth-provider";
import { collection, onSnapshot, query } from"firebase/firestore";
import { db, COLLECTIONS } from"@/services/firebase/firestore";
import { CivicReport } from"@/types";
import { FirestoreUserProfile } from"@/features/auth/repositories/user.repository";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import {
 Search,
 Filter,
 FileText,
 Activity,
 AlertTriangle,
 CheckCircle,
 Eye,
 Calendar,
 X,
 ChevronRight,
 TrendingUp,
 MapPin,
 Clock
} from"lucide-react";
import Link from"next/link";
import { motion, AnimatePresence } from"framer-motion";

export default function AdminReportsListPage() {
 const { profile } = useAuth();
 const [reports, setReports] = useState<CivicReport[]>([]);
 const [users, setUsers] = useState<FirestoreUserProfile[]>([]);
 const [loading, setLoading] = useState(true);

 // Search & Filter State
 const [searchTerm, setSearchTerm] = useState("");
 const [deptFilter, setDeptFilter] = useState("all");
 const [statusFilter, setStatusFilter] = useState("all");
 const [priorityFilter, setPriorityFilter] = useState("all");
 const [categoryFilter, setCategoryFilter] = useState("all");
 const [officerFilter, setOfficerFilter] = useState("all");
 const [dateRangeFilter, setDateRangeFilter] = useState("all"); // all, 24h, 7d, 30d
 const [sortBy, setSortBy] = useState("newest");

 // Load datasets in real-time
 useEffect(() => {
 const unsubUsers = onSnapshot(collection(db, COLLECTIONS.USERS), (snap) => {
 const uList: FirestoreUserProfile[] = [];
 snap.forEach((doc) => {
 uList.push({ uid: doc.id, ...doc.data() } as FirestoreUserProfile);
 });
 setUsers(uList);
 });

 const unsubReports = onSnapshot(collection(db, COLLECTIONS.REPORTS), (snap) => {
 const rList: CivicReport[] = [];
 snap.forEach((doc) => {
 rList.push({ id: doc.id, ...doc.data() } as CivicReport);
 });
 setReports(rList);
 setLoading(false);
 });

 return () => {
 unsubUsers();
 unsubReports();
 };
 }, []);

 // Filter & Sort logic
 const filteredReports = reports
 .filter((r) => {
 const createdByProfile = users.find((u) => u.uid === r.metadata?.createdBy);
 const assignedOfficerProfile = users.find((u) => u.uid === r.ai?.assignment?.officerId);

 const title = (r.ai?.assistant?.title || r.metadata?.title ||"").toLowerCase();
 const desc = (r.ai?.assistant?.description || r.metadata?.description ||"").toLowerCase();
 const citizenName = (createdByProfile?.displayName ||"").toLowerCase();
 const citizenEmail = (createdByProfile?.email ||"").toLowerCase();
 const reportId = (r.id ||"").toLowerCase();

 // Search match
 const matchesSearch =
 title.includes(searchTerm.toLowerCase()) ||
 desc.includes(searchTerm.toLowerCase()) ||
 citizenName.includes(searchTerm.toLowerCase()) ||
 citizenEmail.includes(searchTerm.toLowerCase()) ||
 reportId.includes(searchTerm.toLowerCase());

 // Dropdown filters
 const matchesDept =
 deptFilter ==="all" ||
 r.ai?.assignment?.department === deptFilter ||
 r.ai?.verification?.assignedDepartment === deptFilter;
 const matchesStatus = statusFilter ==="all" || r.status === statusFilter;
 const matchesPriority =
 priorityFilter ==="all" || r.ai?.verification?.priority === priorityFilter;
 const matchesCategory =
 categoryFilter ==="all" ||
 r.ai?.assistant?.category === categoryFilter ||
 r.metadata?.category === categoryFilter;
 const matchesOfficer =
 officerFilter ==="all" || r.ai?.assignment?.officerId === officerFilter;

 // Date Range filter
 let matchesDate = true;
 if (dateRangeFilter !=="all" && r.timestamps?.createdAt) {
 const reportDate = new Date(r.timestamps.createdAt).getTime();
 const now = Date.now();
 const diffMs = now - reportDate;
 if (dateRangeFilter ==="24h") {
 matchesDate = diffMs <= 24 * 60 * 60 * 1000;
 } else if (dateRangeFilter ==="7d") {
 matchesDate = diffMs <= 7 * 24 * 60 * 60 * 1000;
 } else if (dateRangeFilter ==="30d") {
 matchesDate = diffMs <= 30 * 24 * 60 * 60 * 1000;
 }
 }

 return matchesSearch && matchesDept && matchesStatus && matchesPriority && matchesCategory && matchesOfficer && matchesDate;
 })
 .sort((a, b) => {
 // Sort logic
 if (sortBy ==="newest") {
 return new Date(b.timestamps?.createdAt || 0).getTime() - new Date(a.timestamps?.createdAt || 0).getTime();
 }
 if (sortBy ==="oldest") {
 return new Date(a.timestamps?.createdAt || 0).getTime() - new Date(b.timestamps?.createdAt || 0).getTime();
 }
 if (sortBy ==="priority-desc") {
 const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 } as any;
 const weightA = priorityWeight[a.ai?.verification?.priority ||"unknown"] ?? 0;
 const weightB = priorityWeight[b.ai?.verification?.priority ||"unknown"] ?? 0;
 return weightB - weightA;
 }
 return 0;
 });

 // Extract unique departments, officers, categories for dropdown filters
 const departments = Array.from(
 new Set(
 reports
 .map((r) => r.ai?.assignment?.department || r.ai?.verification?.assignedDepartment)
 .filter(Boolean)
)
) as string[];

 const officers = users.filter((u) => u.role ==="officer");

 const categories = Array.from(
 new Set(reports.map((r) => r.ai?.assistant?.category || r.metadata?.category).filter(Boolean))
) as string[];

 // Statistics calculation
 const total = reports.length;
 const pending = reports.filter((r) => r.status ==="submitted" || r.status ==="draft").length;
 const inProgress = reports.filter((r) => r.status ==="investigating" || r.status ==="in_progress" || r.status ==="accepted").length;
 const resolved = reports.filter((r) => r.status ==="resolved").length;

 return (
 <div className="flex flex-col gap-6">
 {/* Page Header */}
 <div>
 <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">
 Incidents Registry
 </h1>
 <p className="text-xs text-slate-500 mt-1">
 Complete database of all citizen reports, AI verification status ratings, department dispatch logs, and resolution details.
 </p>
 </div>

 {/* Summary Stats Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {/* Total */}
 <div className="bg-white/80 border border-slate-200 rounded-3xl p-5 flex flex-col gap-1 backdrop-blur-md shadow-sm">
 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Total Reports</span>
 <span className="text-xl font-black text-slate-800 mt-1 flex items-center gap-2">
 <FileText className="h-4.5 w-4.5 text-indigo-500" /> {loading ?"..." : total}
 </span>
 </div>

 {/* Pending */}
 <div className="bg-white/80 border border-slate-200 rounded-3xl p-5 flex flex-col gap-1 backdrop-blur-md shadow-sm">
 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Pending AI / Triage</span>
 <span className="text-xl font-black text-amber-600 mt-1 flex items-center gap-2">
 <Clock className="h-4.5 w-4.5 text-amber-500" /> {loading ?"..." : pending}
 </span>
 </div>

 {/* In Progress */}
 <div className="bg-white/80 border border-slate-200 rounded-3xl p-5 flex flex-col gap-1 backdrop-blur-md shadow-sm">
 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Active Investigation</span>
 <span className="text-xl font-black text-indigo-650 mt-1 flex items-center gap-2">
 <Activity className="h-4.5 w-4.5 text-indigo-600" /> {loading ?"..." : inProgress}
 </span>
 </div>

 {/* Resolved */}
 <div className="bg-white/80 border border-slate-200 rounded-3xl p-5 flex flex-col gap-1 backdrop-blur-md shadow-sm">
 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Resolved Incidents</span>
 <span className="text-xl font-black text-emerald-600 mt-1 flex items-center gap-2">
 <CheckCircle className="h-4.5 w-4.5 text-emerald-500" /> {loading ?"..." : resolved}
 </span>
 </div>
 </div>

 {/* Search & Filter Bar */}
 <div className="bg-white/90 border border-slate-200 rounded-3xl p-5 flex flex-col gap-4 backdrop-blur-md shadow-sm">
 {/* Search & Basic Sort */}
 <div className="flex flex-col lg:flex-row gap-3 justify-between items-center">
 <div className="relative w-full lg:w-96">
 <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
 <Input
 placeholder="Search reports by title, description, reporter..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="pl-10 bg-slate-50 border-slate-200 text-xs h-9 text-slate-800 rounded-xl focus:border-indigo-550"
 />
 </div>

 <div className="flex items-center gap-2 ml-auto lg:ml-0">
 <span className="text-[10px] uppercase font-bold text-slate-400">Sort:</span>
 <select
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded-xl text-[11px] h-9 px-3 text-slate-700 font-semibold focus:outline-none cursor-pointer"
 >
 <option value="newest">Newest Incidents</option>
 <option value="oldest">Oldest Incidents</option>
 <option value="priority-desc">Urgency (Highest)</option>
 </select>
 </div>
 </div>

 {/* Deep Filters Grid */}
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 border-t border-slate-100 pt-4">
 {/* Department */}
 <div className="flex flex-col gap-1">
 <span className="text-[9px] uppercase font-bold text-slate-400">Department</span>
 <select
 value={deptFilter}
 onChange={(e) => setDeptFilter(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded-xl text-[11px] h-8 px-2 text-slate-700 font-semibold focus:outline-none cursor-pointer"
 >
 <option value="all">All Departments</option>
 {departments.map((d) => (
 <option key={d} value={d}>
 {d}
 </option>
))}
 </select>
 </div>

 {/* Status */}
 <div className="flex flex-col gap-1">
 <span className="text-[9px] uppercase font-bold text-slate-400">Incident Status</span>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded-xl text-[11px] h-8 px-2 text-slate-700 font-semibold focus:outline-none cursor-pointer"
 >
 <option value="all">All Statuses</option>
 <option value="submitted">Submitted (Triage)</option>
 <option value="accepted">Accepted</option>
 <option value="investigating">Investigating</option>
 <option value="in_progress">In Progress</option>
 <option value="resolved">Resolved</option>
 <option value="rejected">Rejected</option>
 </select>
 </div>

 {/* Priority */}
 <div className="flex flex-col gap-1">
 <span className="text-[9px] uppercase font-bold text-slate-400">Priority Level</span>
 <select
 value={priorityFilter}
 onChange={(e) => setPriorityFilter(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded-xl text-[11px] h-8 px-2 text-slate-700 font-semibold focus:outline-none cursor-pointer"
 >
 <option value="all">All Priorities</option>
 <option value="critical">Critical</option>
 <option value="high">High</option>
 <option value="medium">Medium</option>
 <option value="low">Low</option>
 <option value="unknown">Unknown</option>
 </select>
 </div>

 {/* Category */}
 <div className="flex flex-col gap-1">
 <span className="text-[9px] uppercase font-bold text-slate-400">Category</span>
 <select
 value={categoryFilter}
 onChange={(e) => setCategoryFilter(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded-xl text-[11px] h-8 px-2 text-slate-700 font-semibold focus:outline-none cursor-pointer"
 >
 <option value="all">All Categories</option>
 {categories.map((c) => (
 <option key={c} value={c}>
 {c.replace("_","").toUpperCase()}
 </option>
))}
 </select>
 </div>

 {/* Officer */}
 <div className="flex flex-col gap-1">
 <span className="text-[9px] uppercase font-bold text-slate-400">Assigned Officer</span>
 <select
 value={officerFilter}
 onChange={(e) => setOfficerFilter(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded-xl text-[11px] h-8 px-2 text-slate-700 font-semibold focus:outline-none cursor-pointer"
 >
 <option value="all">All Officers</option>
 {officers.map((o) => (
 <option key={o.uid} value={o.uid}>
 {o.displayName}
 </option>
))}
 </select>
 </div>

 {/* Date Range */}
 <div className="flex flex-col gap-1">
 <span className="text-[9px] uppercase font-bold text-slate-400">Date Range</span>
 <select
 value={dateRangeFilter}
 onChange={(e) => setDateRangeFilter(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded-xl text-[11px] h-8 px-2 text-slate-700 font-semibold focus:outline-none cursor-pointer"
 >
 <option value="all">All Time</option>
 <option value="24h">Past 24 Hours</option>
 <option value="7d">Past 7 Days</option>
 <option value="30d">Past 30 Days</option>
 </select>
 </div>
 </div>
 </div>

 {/* Reports Table List */}
 <div className="bg-white/80 border border-slate-200 rounded-3xl overflow-hidden backdrop-blur-md shadow-sm">
 {loading ? (
 <div className="py-24 text-center text-slate-400 text-xs animate-pulse flex flex-col items-center gap-3">
 <Activity className="h-6 w-6 animate-spin text-indigo-500" />
 Synchronizing system reports...
 </div>
) : filteredReports.length === 0 ? (
 <div className="py-24 text-center text-slate-400 text-xs">
 No incidents registry matching filter configurations.
 </div>
) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse text-xs">
 <thead>
 <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider">
 <th className="px-6 py-4">Incident details</th>
 <th className="px-6 py-4">Status</th>
 <th className="px-6 py-4">AI Urgency</th>
 <th className="px-6 py-4">Category</th>
 <th className="px-6 py-4">Department</th>
 <th className="px-6 py-4">Assigned officer</th>
 <th className="px-6 py-4">Reporter</th>
 <th className="px-6 py-4">Reported Date</th>
 <th className="px-6 py-4 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {filteredReports.map((r) => {
 const createdByProfile = users.find((u) => u.uid === r.metadata?.createdBy);
 const assignedOfficerProfile = users.find((u) => u.uid === r.ai?.assignment?.officerId);
 const priority = r.ai?.verification?.priority ||"unknown";

 return (
 <tr key={r.id} className="hover:bg-slate-50/30 .01] transition-colors">
 <td className="px-6 py-4 max-w-xs">
 <div className="flex flex-col gap-0.5">
 <span className="font-extrabold text-slate-800 line-clamp-1 text-xs">
 {r.ai?.assistant?.title || r.metadata?.title}
 </span>
 <span className="text-[10px] text-slate-400 font-mono leading-none">
 ID: {r.id.substring(0, 8)}...
 </span>
 <span className="text-[9px] text-slate-400 flex items-center gap-1 mt-1">
 <MapPin className="h-3 w-3 shrink-0 text-slate-400" /> {r.location?.formattedAddress ||"No location coordinates"}
 </span>
 </div>
 </td>
 <td className="px-6 py-4">
 <span
 className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
 r.status ==="resolved"
 ?"bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
 : r.status ==="rejected"
 ?"bg-rose-500/10 text-rose-600 border-rose-500/20"
 : r.status ==="investigating" || r.status ==="in_progress"
 ?"bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
 :"bg-amber-500/10 text-amber-600 border-amber-500/20"
 }`}
 >
 {r.status.replace("_","")}
 </span>
 </td>
 <td className="px-6 py-4">
 <span
 className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
 priority ==="critical"
 ?"bg-rose-500/10 text-rose-600 border-rose-500/20"
 : priority ==="high"
 ?"bg-amber-500/10 text-amber-600 border-amber-500/20"
 : priority ==="medium"
 ?"bg-yellow-550/10 text-yellow-600 border-yellow-500/20"
 :"bg-slate-100 text-slate-400 border-slate-200"
 }`}
 >
 {priority}
 </span>
 </td>
 <td className="px-6 py-4 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
 {(r.ai?.assistant?.category || r.metadata?.category ||"other").replace("_","")}
 </td>
 <td className="px-6 py-4 text-slate-700 font-extrabold">
 {r.ai?.assignment?.department || r.ai?.verification?.assignedDepartment ||"Unassigned"}
 </td>
 <td className="px-6 py-4 text-slate-600">
 {assignedOfficerProfile ? (
 <div className="flex items-center gap-1.5">
 <span className="font-bold">{assignedOfficerProfile.displayName}</span>
 </div>
) : (
 <span className="text-slate-400 italic">None Assigned</span>
)}
 </td>
 <td className="px-6 py-4">
 <div className="flex flex-col">
 <span className="font-bold text-slate-700">{createdByProfile?.displayName ||"Citizen"}</span>
 <span className="text-[10px] font-mono text-slate-400">{createdByProfile?.email ||"—"}</span>
 </div>
 </td>
 <td className="px-6 py-4 text-slate-400 font-mono">
 {r.timestamps?.createdAt ? new Date(r.timestamps.createdAt).toLocaleDateString() :"—"}
 </td>
 <td className="px-6 py-4 text-right">
 <Link href={`/admin/reports/${r.id}`}>
 <Button
 variant="outline"
 size="sm"
 className="border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[10px] py-1 h-7 inline-flex items-center gap-1 rounded-full shadow-sm"
 >
 <Eye className="h-3.5 w-3.5" /> Inspect
 </Button>
 </Link>
 </td>
 </tr>
);
 })}
 </tbody>
 </table>
 </div>
)}
 </div>
 </div>
);
}
