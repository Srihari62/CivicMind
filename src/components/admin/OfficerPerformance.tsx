/**
 * @file src/components/admin/OfficerPerformance.tsx
 * @description Officer Performance Dashboard for SPRINT 10.
 * Computes officer workload efficiency scores, active case loads, and highlights top performers.
 */

"use client";

import React from"react";
import { Award, User, Clock, Zap } from"lucide-react";
import { FirestoreUserProfile } from"@/features/auth/repositories/user.repository";
import { CivicReport } from"@/types";

interface OfficerPerformanceProps {
 officers: FirestoreUserProfile[];
 reports: CivicReport[];
}

export default function OfficerPerformance({ officers, reports }: OfficerPerformanceProps) {
 // Aggregate stats per officer
 const officerStats = officers.map((officer) => {
 const assignedReports = reports.filter((r) => r.ai?.assignment?.officerId === officer.uid);
 const resolvedReports = assignedReports.filter((r) => r.status ==="resolved");
 const activeReports = assignedReports.filter((r) => ["investigating","in_progress","accepted"].includes(r.status));

 // Calculate average resolution time in hours
 let avgHours = 0;
 if (resolvedReports.length > 0) {
 const totalHours = resolvedReports.reduce((sum, r) => {
 const start = new Date(r.timestamps.createdAt).getTime();
 const end = new Date(r.timestamps.updatedAt).getTime();
 return sum + Math.max(0, (end - start) / (1000 * 60 * 60));
 }, 0);
 avgHours = totalHours / resolvedReports.length;
 }

 // Calculate Efficiency Score (0-100)
 // Formula: 60% based on resolution rate, 40% based on resolution speed (with speed scoring dropping as hours increase)
 const resolutionRate = assignedReports.length > 0 ? resolvedReports.length / assignedReports.length : 0;
 const speedScore = avgHours > 0 ? Math.max(0, 40 - avgHours * 0.5) : 30; // default 30 pts if no resolved cases yet
 const efficiencyScore = Math.min(100, Math.round(resolutionRate * 60 + speedScore));

 return {
 profile: officer,
 assignedCount: assignedReports.length,
 resolvedCount: resolvedReports.length,
 activeCount: activeReports.length,
 avgHours: avgHours,
 efficiencyScore: assignedReports.length > 0 ? efficiencyScore : 0,
 };
 });

 // Sort by efficiency score descending
 const sortedOfficers = [...officerStats].sort((a, b) => b.efficiencyScore - a.efficiencyScore);

 return (
 <div className="w-full clay-card p-6 space-y-6">
 {/* Title */}
 <div className="flex items-center justify-between border-b border-slate-200 pb-4">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
 <Zap className="w-5 h-5 text-blue-400" />
 </div>
 <div>
 <h3 className="text-lg font-bold text-slate-800">Officer Performance Audit</h3>
 <span className="text-xs text-slate-500">Municipal service response and dispatch telemetry</span>
 </div>
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse text-xs">
 <thead>
 <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
 <th className="px-4 py-3">Officer Details</th>
 <th className="px-4 py-3">Availability</th>
 <th className="px-4 py-3 text-center">Assigned Cases</th>
 <th className="px-4 py-3 text-center">Resolved Cases</th>
 <th className="px-4 py-3 text-center">Active Workload</th>
 <th className="px-4 py-3">Avg Resolution SLA</th>
 <th className="px-4 py-3 text-right">Efficiency Score</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {sortedOfficers.length === 0 ? (
 <tr>
 <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">
 No active officers registered in system directory.
 </td>
 </tr>
) : (
 sortedOfficers.map((stat, idx) => {
 const isTopPerformer = idx === 0 && stat.efficiencyScore > 50;
 const availability = stat.profile.availability ||"offline";

 return (
 <tr 
 key={stat.profile.uid} 
 className={`hover:bg-white/[0.02] transition-colors ${
 isTopPerformer ?"bg-yellow-500/[0.03] border-l-2 border-l-yellow-500" :""
 }`}
 >
 <td className="px-4 py-4.5 flex items-center gap-3">
 <div className="relative">
 <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs overflow-hidden">
 {stat.profile.photoURL ? (
 /* eslint-disable-next-line @next/next/no-img-element */
 <img src={stat.profile.photoURL} alt={stat.profile.displayName} className="h-full w-full object-cover" />
) : (
 <User className="w-4 h-4 text-slate-500" />
)}
 </div>
 {isTopPerformer && (
 <div className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-yellow-500 border border-zinc-950">
 <Award className="w-3 h-3 text-zinc-950" />
 </div>
)}
 </div>
 <div className="flex flex-col gap-0.5">
 <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
 {stat.profile.displayName ||"Officer Candidate"}
 {isTopPerformer && (
 <span className="text-[10px] bg-yellow-500/20 text-yellow-400 font-black px-1.5 py-0.5 rounded border border-yellow-500/30">
 Top SLA
 </span>
)}
 </span>
 <span className="text-slate-500 text-[10px] font-mono capitalize">
 {stat.profile.department ||"General"} Division • {stat.profile.zone ||"No Zone"}
 </span>
 </div>
 </td>
 <td className="px-4 py-4.5">
 <span
 className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
 availability ==="available"
 ?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
 : availability ==="busy"
 ?"bg-amber-500/10 text-amber-400 border-amber-500/20"
 :"bg-slate-200/40 text-slate-500 border-slate-200"
 }`}
 >
 {availability}
 </span>
 </td>
 <td className="px-4 py-4.5 text-center font-mono font-bold text-slate-600">
 {stat.assignedCount}
 </td>
 <td className="px-4 py-4.5 text-center font-mono font-bold text-slate-600">
 {stat.resolvedCount}
 </td>
 <td className="px-4 py-4.5 text-center font-mono font-bold text-slate-600">
 {stat.activeCount}
 </td>
 <td className="px-4 py-4.5 font-mono text-slate-500">
 {stat.avgHours > 0 ? (
 <span className="flex items-center gap-1">
 <Clock className="w-3.5 h-3.5 text-slate-500" />
 {stat.avgHours.toFixed(1)} hrs
 </span>
) : (
"—"
)}
 </td>
 <td className="px-4 py-4.5 text-right font-mono font-black text-sm">
 <span className={stat.efficiencyScore >= 80 ?"text-emerald-400" : stat.efficiencyScore >= 60 ?"text-blue-400" :"text-slate-500"}>
 {stat.efficiencyScore}%
 </span>
 </td>
 </tr>
);
 })
)}
 </tbody>
 </table>
 </div>
 </div>
);
}
