/**
 * @file src/components/dashboard/CitizenStatsCard.tsx
 * @description Stats summary card for citizens.
 * Displays submitted, verified, resolved, in-progress reports, community score, and reporting streaks.
 */

"use client";

import React, { useState } from"react";
import { motion, AnimatePresence } from"framer-motion";
import { FileText, CheckCircle, Clock, Award, Flame, Zap, History, Sparkles } from"lucide-react";
import { CivicReport } from"@/types";

interface CitizenStatsCardProps {
 reports: CivicReport[];
 stats?: {
 points: number;
 contributionScore: number;
 civicScore: number;
 level: number;
 contributionLevel?: number;
 civicLevel?: number;
 badges: string[];
 reportsSubmitted: number;
 reportsAssigned: number;
 reportsResolved: number;
 reportsVerified: number;
 streakDays: number;
 longestStreak: number;
 };
}

export default function CitizenStatsCard({ reports, stats }: CitizenStatsCardProps) {
 const [showScoreModal, setShowScoreModal] = useState(false);
 const totalSubmitted = reports.length;
 
 const totalVerified = reports.filter(
 (r) => r.ai?.verification?.status ==="verified" || !["submitted","processing","rejected","failed"].includes(r.status)
).length;

 const totalResolved = reports.filter((r) => r.status ==="resolved").length;
 
 const totalInProgress = reports.filter(
 (r) => ["accepted","in_progress"].includes(r.status)
).length;

 const contributionScore = (totalSubmitted * 10) + (totalVerified * 20) + (totalResolved * 50);

 const calculateStreak = () => {
 if (reports.length === 0) return 0;
 const dates = reports
 .map((r) => r.timestamps?.createdAt ? new Date(r.timestamps.createdAt).toDateString() :"")
 .filter(Boolean);
 
 const uniqueDates = Array.from(new Set(dates)).map((d) => new Date(d).getTime());
 uniqueDates.sort((a, b) => b - a); // Newest first

 let streak = 0;
 const oneDayMs = 24 * 60 * 60 * 1000;
 const today = new Date();
 today.setHours(0, 0, 0, 0);

 const latestReportDate = new Date(uniqueDates[0]);
 latestReportDate.setHours(0, 0, 0, 0);

 const diffToToday = today.getTime() - latestReportDate.getTime();
 if (diffToToday > oneDayMs) {
 return 0;
 }

 streak = 1;
 for (let i = 0; i < uniqueDates.length - 1; i++) {
 const current = new Date(uniqueDates[i]);
 const next = new Date(uniqueDates[i + 1]);
 current.setHours(0, 0, 0, 0);
 next.setHours(0, 0, 0, 0);

 const diff = current.getTime() - next.getTime();
 if (diff === oneDayMs) {
 streak++;
 } else if (diff > oneDayMs) {
 break; // Streak broken
 }
 }
 return streak;
 };

 const streak = calculateStreak();

 const computedStats = stats || {
 points: contributionScore,
 contributionScore: contributionScore,
 civicScore: 0,
 level: 1,
 contributionLevel: 1,
 civicLevel: 1,
 badges: [],
 reportsSubmitted: totalSubmitted,
 reportsAssigned: totalInProgress,
 reportsResolved: totalResolved,
 reportsVerified: totalVerified,
 streakDays: streak,
 longestStreak: streak,
 };

 const getNextLevelXP = (level: number) => {
 if (level === 1) return 100;
 if (level === 2) return 250;
 if (level === 3) return 500;
 if (level === 4) return 1000;
 return 1000;
 };

 const getPrevLevelXP = (level: number) => {
 if (level === 1) return 0;
 if (level === 2) return 100;
 if (level === 3) return 250;
 if (level === 4) return 500;
 return 1000;
 };

 // Contribution level progress calculation
 const contribLevel = computedStats.contributionLevel || 1;
 const contribNextXP = getNextLevelXP(contribLevel);
 const contribPrevXP = getPrevLevelXP(contribLevel);
 const contribProgress = contribLevel >= 5 ? 100 : ((computedStats.contributionScore - contribPrevXP) / (contribNextXP - contribPrevXP)) * 100;

 // Civic level progress calculation
 const civicLevelVal = computedStats.civicLevel || 1;
 const civicNextXP = getNextLevelXP(civicLevelVal);
 const civicPrevXP = getPrevLevelXP(civicLevelVal);
 const civicProgress = civicLevelVal >= 5 ? 100 : ((computedStats.civicScore - civicPrevXP) / (civicNextXP - civicPrevXP)) * 100;

 const statItems = [
 {
 label:"Reports Submitted",
 value: computedStats.reportsSubmitted,
 icon: FileText,
 color:"text-blue-400 bg-blue-500/10 border-blue-500/20",
 },
 {
 label:"Verified Reports",
 value: computedStats.reportsVerified,
 icon: Award,
 color:"text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
 },
 {
 label:"Reports In Progress",
 value: computedStats.reportsAssigned,
 icon: Clock,
 color:"text-amber-400 bg-amber-500/10 border-amber-500/20",
 },
 {
 label:"Resolved Reports",
 value: computedStats.reportsResolved,
 icon: CheckCircle,
 color:"text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
 },
 ];

 return (
 <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
 {/* Left side: Stats Grid */}
 <div className="lg:col-span-2 grid grid-cols-2 gap-4">
 {statItems.map((item, idx) => {
 const Icon = item.icon;
 return (
 <motion.div
 key={item.label}
 initial={{ opacity: 0, y: 15 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: idx * 0.05 }}
 className="clay-card p-5 flex items-center justify-between gap-4"
 >
 <div className="space-y-1">
 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
 {item.label}
 </span>
 <span className="text-2xl font-extrabold text-slate-800 font-mono block">
 {item.value}
 </span>
 </div>
 <div className={`p-3 rounded-2xl border ${item.color}`}>
 <Icon className="w-5 h-5" />
 </div>
 </motion.div>
);
 })}
 </div>

 {/* Contribution Score Card */}
 <motion.div
 initial={{ opacity: 0, y: 15 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.2 }}
 onClick={() => setShowScoreModal(true)}
 className="clay-card bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 p-5 flex flex-col justify-between gap-5 cursor-pointer hover:shadow-xl transition-all select-none group"
 title="View Contribution Score Breakdown"
 >
 <div className="flex justify-between items-start">
 <div className="space-y-1 flex-1">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block group-hover:text-emerald-600 transition-colors">
 Contribution Score
 </span>
 <History className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 group-hover:rotate-12 transition-all mr-2" />
 </div>
 <span className="text-3xl font-black text-slate-800 font-mono flex items-center gap-2 mt-1">
 <Zap className="w-6 h-6 text-emerald-500 fill-emerald-500/10 group-hover:scale-110 transition-transform" />
 {computedStats.contributionScore}
 </span>
 </div>
 <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-amber-600">
 <Flame className="w-3.5 h-3.5 fill-amber-500/10 animate-pulse" />
 <span className="text-[10px] font-bold font-mono">{computedStats.streakDays}d Streak</span>
 </div>
 </div>

 <div className="text-xs text-slate-500 space-y-1.5 border-t border-slate-100 pt-3">
 <span className="font-bold text-slate-700">Contrib Lvl {contribLevel} Progress</span>
 <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
 <div 
 className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" 
 style={{ width: `${Math.max(0, Math.min(100, contribProgress))}%` }} 
 />
 </div>
 <span className="block text-[10px] text-slate-400 text-right">
 {contribLevel >= 5 ?"Max Level Reached" : `${computedStats.contributionScore} / ${contribNextXP} XP to next level`}
 </span>
 </div>
 </motion.div>

 {/* Civic Score Card */}
 <motion.div
 initial={{ opacity: 0, y: 15 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.25 }}
 onClick={() => setShowScoreModal(true)}
 className="clay-card bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent border border-indigo-500/20 p-5 flex flex-col justify-between gap-5 cursor-pointer hover:shadow-xl transition-all select-none group"
 title="View Civic Score Breakdown"
 >
 <div className="flex justify-between items-start">
 <div className="space-y-1 flex-1">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block group-hover:text-indigo-650 transition-colors">
 Civic Score
 </span>
 <History className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:rotate-12 transition-all mr-2" />
 </div>
 <span className="text-3xl font-black text-slate-800 font-mono flex items-center gap-2 mt-1">
 <Award className="w-6 h-6 text-indigo-500 fill-indigo-500/10 group-hover:scale-110 transition-transform" />
 {computedStats.civicScore}
 </span>
 </div>
 <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-indigo-600">
 <Sparkles className="w-3.5 h-3.5 fill-indigo-500/10" />
 <span className="text-[10px] font-bold font-mono">Civic</span>
 </div>
 </div>

 <div className="text-xs text-slate-500 space-y-1.5 border-t border-slate-100 pt-3">
 <span className="font-bold text-slate-700">Civic Lvl {civicLevelVal} Progress</span>
 <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
 <div 
 className="h-full bg-gradient-to-r from-indigo-500 to-blue-550" 
 style={{ width: `${Math.max(0, Math.min(100, civicProgress))}%` }} 
 />
 </div>
 <span className="block text-[10px] text-slate-400 text-right">
 {civicLevelVal >= 5 ?"Max Level Reached" : `${computedStats.civicScore} / ${civicNextXP} XP to next level`}
 </span>
 </div>
 </motion.div>

 {/* Contribution & Civic Score Breakdown Modal */}
 <AnimatePresence>
 {showScoreModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 className="relative w-full max-w-lg clay-card p-6 flex flex-col gap-4 max-h-[85vh] overflow-hidden text-left"
 >
 <div className="flex items-center justify-between border-b border-slate-100 pb-4">
 <div className="flex items-center gap-2">
 <Zap className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
 <h2 className="text-lg font-extrabold text-slate-850">Gamification Scoring Rules</h2>
 </div>
 <button
 onClick={() => setShowScoreModal(false)}
 className="text-slate-500 hover:bg-slate-100 transition text-xs font-bold px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200"
 >
 Close
 </button>
 </div>

 <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200/50 flex flex-col gap-3">
 <div>
 <h3 className="font-extrabold text-emerald-600 mb-1.5 uppercase tracking-wider text-[10px]">Contribution Points (Assigned & Verified)</h3>
 <div className="flex justify-between mb-1">
 <span>Citizen Verification Submitted:</span>
 <span className="font-mono text-slate-700 font-bold">+15 PTS / action</span>
 </div>
 <div className="flex justify-between">
 <span>Report Assigned/Accepted by Officer:</span>
 <span className="font-mono text-slate-700 font-bold">+50 PTS / report</span>
 </div>
 </div>
 
 <div className="border-t border-slate-200 pt-2">
 <h3 className="font-extrabold text-indigo-600 mb-1.5 uppercase tracking-wider text-[10px]">Civic Points (Resolved)</h3>
 <div className="flex justify-between">
 <span>Incident Successfully Resolved:</span>
 <span className="font-mono text-slate-700 font-bold">+100 PTS / report</span>
 </div>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
 <div className="text-xs font-bold text-slate-450 uppercase tracking-wider border-b border-slate-100 pb-1">
 Active Civic History
 </div>
 {reports.length === 0 ? (
 <div className="text-center py-12 text-slate-400 text-xs font-medium">
 No active incident history available.
 </div>
) : (
 reports.map((report) => {
 const isAssigned = ["accepted","travelling","investigating","repair_in_progress","awaiting_verification","resolved"].includes(report.status);
 const isResolved = report.status ==="resolved";

 return (
 <div
 key={report.id}
 className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-100/50 transition flex flex-col gap-2"
 >
 <div className="flex justify-between items-start gap-4">
 <span className="font-bold text-sm text-slate-800 truncate">
 {report.ai?.assistant?.title || report.metadata.title}
 </span>
 <div className="flex flex-col items-end">
 {isAssigned && (
 <span className="text-[10px] font-black font-mono text-emerald-600">
 +50 Contrib PTS
 </span>
)}
 {isResolved && (
 <span className="text-[10px] font-black font-mono text-indigo-600">
 +100 Civic PTS
 </span>
)}
 </div>
 </div>

 <div className="flex flex-col gap-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
 <div className="flex justify-between">
 <span>Status:</span>
 <span className="font-mono uppercase font-bold text-slate-700">{report.status}</span>
 </div>
 </div>
 </div>
);
 })
)}
 </div>
 </motion.div>
 </div>
)}
 </AnimatePresence>
 </div>
);
}
