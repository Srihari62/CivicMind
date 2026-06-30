/**
 * @file src/app/(dashboard)/officer/assigned/page.tsx
 * @description Displays assigned/active cases for the logged-in officer.
 */

"use client";

import { useEffect, useState } from"react";
import { useAuth } from"@/providers/auth-provider";
import { Button } from"@/components/ui/button";
import { CivicReport } from"@/types";
import { Clock, AlertCircle, RefreshCw, Search, Filter, ArrowRight } from"lucide-react";
import Link from"next/link";
import { collection, query, onSnapshot, where } from"firebase/firestore";
import { db, COLLECTIONS } from"@/services/firebase/firestore";

export const dynamic ="force-dynamic";

export default function AssignedCasesPage() {
 const { profile } = useAuth();
 const [reports, setReports] = useState<CivicReport[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // Search & Filter State
 const [searchTerm, setSearchTerm] = useState("");
 const [statusFilter, setStatusFilter] = useState("all");
 const [categoryFilter, setCategoryFilter] = useState("all");

 useEffect(() => {
 if (!profile?.uid) return;

 setLoading(true);
 const q = profile.city
 ? query(
 collection(db, COLLECTIONS.REPORTS),
 where("city","==", profile.city)
)
 : query(collection(db, COLLECTIONS.REPORTS));

 const unsubscribe = onSnapshot(
 q,
 (snapshot) => {
 const list: CivicReport[] = [];
 snapshot.forEach((docSnap) => {
 list.push({ id: docSnap.id, ...docSnap.data() } as CivicReport);
 });
 setReports(list);
 setLoading(false);
 },
 (err) => {
 console.error("Error subscribing to reports:", err);
 setError("Failed to stream reports update.");
 setLoading(false);
 }
);

 return () => unsubscribe();
 }, [profile?.uid, profile?.city]);

 // Filter reports: only show reports that the officer still owns and are NOT resolved
 const myActiveReports = reports.filter((r) => {
 const isMyUid = r.ai?.assignment?.officerId === profile?.uid;
 if (!isMyUid) return false;

 // Check if status is active (not resolved, closed, rejected)
 const activeStatuses = [
"assigned",
"accepted",
"travelling",
"investigating",
"repair_in_progress",
"awaiting_verification",
"reopened"
 ];
 return activeStatuses.includes(r.status);
 });

 const filteredReports = myActiveReports.filter((r) => {
 const matchesSearch =
 r.metadata.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
 r.metadata.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
 r.location.formattedAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
 r.id.toLowerCase().includes(searchTerm.toLowerCase());

 const matchesStatus = statusFilter ==="all" || r.status === statusFilter;
 const matchesCategory = categoryFilter ==="all" || r.metadata.category === categoryFilter;

 return matchesSearch && matchesStatus && matchesCategory;
 });

 return (
 <div className="max-w-6xl w-full mx-auto px-6 py-6 flex flex-col gap-8 relative z-10">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex flex-col gap-1">
 <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
 Active <span className="text-orange-600">Assigned Cases</span>
 </h1>
 <p className="text-sm text-slate-500">
 Field dispatches, active investigations, and pending validations currently on your workload.
 </p>
 </div>
 <Button
 onClick={() => window.location.reload()}
 disabled={loading}
 variant="outline"
 size="sm"
 className="self-start md:self-auto border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2"
 >
 <RefreshCw className={`h-4 w-4 ${loading ?"animate-spin" :""}`} />
 Sync
 </Button>
 </div>

 {/* Filters and Search */}
 <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-md">
 <div className="relative w-full lg:max-w-md">
 <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
 <input
 type="text"
 placeholder="Search active cases by ID, title, or address..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-250 rounded-2xl text-sm text-slate-800 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-inner"
 />
 </div>

 <div className="flex flex-wrap gap-3 w-full lg:w-auto">
 <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 px-3.5 py-1.5 border border-slate-200 rounded-2xl shadow-inner">
 <Filter className="h-4 w-4 text-slate-400" />
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="bg-transparent text-xs text-slate-750 focus:outline-none cursor-pointer capitalize font-bold"
 >
 <option value="all" className="">All States</option>
 <option value="assigned" className="">Assigned</option>
 <option value="accepted" className="">Accepted</option>
 <option value="travelling" className="">Travelling</option>
 <option value="investigating" className="">Investigating</option>
 <option value="repair_in_progress" className="">Repair in Progress</option>
 <option value="awaiting_verification" className="">Awaiting Verification</option>
 <option value="reopened" className="">Reopened</option>
 </select>
 </div>

 <div className="flex items-center bg-slate-50 px-3.5 py-1.5 border border-slate-200 rounded-2xl shadow-inner">
 <select
 value={categoryFilter}
 onChange={(e) => setCategoryFilter(e.target.value)}
 className="bg-transparent text-xs text-slate-750 focus:outline-none cursor-pointer capitalize font-bold"
 >
 <option value="all" className="">All Categories</option>
 <option value="Roads" className="">Roads & Potholes</option>
 <option value="Sanitation" className="">Sanitation & Garbage</option>
 <option value="Utilities" className="">Utilities & Water</option>
 <option value="Safety" className="">Public Safety</option>
 </select>
 </div>
 </div>
 </div>

 {loading ? (
 <div className="flex flex-col items-center justify-center py-20 gap-4">
 <RefreshCw className="h-8 w-8 text-orange-550 animate-spin" />
 <p className="text-sm text-slate-450 font-medium">Streaming active dispatches...</p>
 </div>
) : filteredReports.length === 0 ? (
 <div className="clay-card p-16 flex flex-col items-center justify-center text-center">
 <Clock className="h-12 w-12 text-slate-400 mb-4" />
 <h3 className="text-lg font-bold text-slate-850 mb-1">Clear Workload</h3>
 <p className="text-sm text-slate-450 max-w-sm">
 There are no active assigned cases matching your search criteria. Great job!
 </p>
 </div>
) : (
 <div className="clay-card overflow-hidden p-0">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
 <th className="px-6 py-4">ID</th>
 <th className="px-6 py-4">Title & Address</th>
 <th className="px-6 py-4">Department</th>
 <th className="px-6 py-4">Status</th>
 <th className="px-6 py-4">Reported</th>
 <th className="px-6 py-4 text-right"></th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 font-medium">
 {filteredReports.map((report) => (
 <tr key={report.id} className="hover:bg-slate-100/30 transition-colors">
 <td className="px-6 py-4 text-xs font-mono font-bold text-orange-600">
 #{report.id.substring(0, 8)}
 </td>
 <td className="px-6 py-4">
 <div className="flex flex-col">
 <span className="text-sm font-extrabold text-slate-800">{report.metadata.title}</span>
 <span className="text-xs text-slate-400 line-clamp-1">{report.location.formattedAddress}</span>
 </div>
 </td>
 <td className="px-6 py-4 text-xs font-semibold text-slate-650">
 {report.ai?.assignment?.department ||"Pending Audit"}
 </td>
 <td className="px-6 py-4">
 <span
 className={`text-xs px-2.5 py-1 rounded-full font-bold inline-block capitalize border ${
 report.status ==="assigned"
 ?"bg-slate-100 text-slate-600 border-slate-200"
 : report.status ==="accepted"
 ?"bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
 : report.status ==="travelling"
 ?"bg-cyan-500/10 text-cyan-600 border-cyan-500/20"
 : report.status ==="investigating"
 ?"bg-amber-500/10 text-amber-600 border-amber-500/20"
 : report.status ==="repair_in_progress"
 ?"bg-blue-500/10 text-blue-600 border-blue-500/20"
 : report.status ==="awaiting_verification"
 ?"bg-purple-500/10 text-purple-600 border-purple-500/20"
 : report.status ==="reopened"
 ?"bg-rose-500/10 text-rose-600 border-rose-500/20"
 :"bg-slate-100 text-slate-500 border-slate-200"
 }`}
 >
 {report.status.replace(/_/g,"")}
 </span>
 </td>
 <td className="px-6 py-4 text-xs text-slate-450">
 {new Date(report.timestamps.createdAt).toLocaleDateString()}
 </td>
 <td className="px-6 py-4 text-right">
 <Link href={`/officer/reports/${report.id}/investigate`}>
 <Button
 variant="ghost"
 size="sm"
 className="text-orange-600 hover:text-orange-500 hover:bg-orange-500/10 gap-1.5 font-bold uppercase tracking-wider text-[10px]"
 >
 Investigate
 <ArrowRight className="h-3.5 w-3.5" />
 </Button>
 </Link>
 </td>
 </tr>
))}
 </tbody>
 </table>
 </div>
 </div>
)}
 </div>
);
}
