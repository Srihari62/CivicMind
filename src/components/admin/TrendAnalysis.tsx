/**
 * @file src/components/admin/TrendAnalysis.tsx
 * @description Category trend indicators comparing historical periods for SPRINT 10.
 * Computes rates of change and renders custom animated trend widgets.
 */

"use client";

import React, { useState } from"react";
import { motion } from"framer-motion";
import { TrendingUp, TrendingDown, Minus, Info } from"lucide-react";
import { CivicReport } from"@/types";

interface TrendAnalysisProps {
 reports: CivicReport[];
}

export default function TrendAnalysis({ reports }: TrendAnalysisProps) {
 const [period, setPeriod] = useState<"day" |"week" |"month">("week");

 // Normalized category keys to track
 const targetCategories = [
 { key:"road_damage", label:"Road Damage" },
 { key:"garbage", label:"Garbage & Waste" },
 { key:"water_leakage", label:"Water Leakage" },
 { key:"street_light", label:"Street Lights" },
 { key:"drainage", label:"Drainage Blocks" },
 ];

 const calculateTrend = (catKey: string) => {
 const now = Date.now();
 const oneDay = 24 * 60 * 60 * 1000;

 let currentCount = 0;
 let previousCount = 0;
 let label ="";

 if (period ==="day") {
 // Today (0-24h) vs Yesterday (24-48h)
 label ="Today vs Yesterday";
 reports.forEach((r) => {
 if (r.metadata?.category !== catKey) return;
 const time = new Date(r.timestamps.createdAt).getTime();
 const age = now - time;
 if (age < oneDay) {
 currentCount++;
 } else if (age < oneDay * 2) {
 previousCount++;
 }
 });
 } else if (period ==="week") {
 // This Week (0-7d) vs Last Week (7-14d)
 label ="This Week vs Last Week";
 reports.forEach((r) => {
 if (r.metadata?.category !== catKey) return;
 const time = new Date(r.timestamps.createdAt).getTime();
 const age = now - time;
 if (age < oneDay * 7) {
 currentCount++;
 } else if (age < oneDay * 14) {
 previousCount++;
 }
 });
 } else {
 // This Month (0-30d) vs Last Month (30-60d)
 label ="This Month vs Last Month";
 reports.forEach((r) => {
 if (r.metadata?.category !== catKey) return;
 const time = new Date(r.timestamps.createdAt).getTime();
 const age = now - time;
 if (age < oneDay * 30) {
 currentCount++;
 } else if (age < oneDay * 60) {
 previousCount++;
 }
 });
 }

 // Calculate percentage change
 // If both are 0, change is 0. If previous is 0 but current is > 0, make it currentCount * 100%
 let pctChange = 0;
 if (currentCount === 0 && previousCount === 0) {
 pctChange = 0;
 } else if (previousCount === 0) {
 pctChange = currentCount * 100;
 } else {
 pctChange = Math.round(((currentCount - previousCount) / previousCount) * 100);
 }

 return {
 currentCount,
 previousCount,
 pctChange,
 label,
 };
 };

 return (
 <div className="w-full clay-card p-6 space-y-6">
 {/* Title & Period Selector */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
 <TrendingUp className="w-5 h-5 text-yellow-400" />
 </div>
 <div>
 <h3 className="text-lg font-bold text-slate-800">Operational Trend Analytics</h3>
 <span className="text-xs text-slate-500">Category volume metrics compared across time boundaries</span>
 </div>
 </div>

 {/* Tab-styled buttons */}
 <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5 self-start sm:self-auto">
 <button
 onClick={() => setPeriod("day")}
 className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
 period ==="day" ?"bg-yellow-500 text-black shadow-md" :"text-slate-500 hover:text-slate-800"
 }`}
 >
 Daily
 </button>
 <button
 onClick={() => setPeriod("week")}
 className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
 period ==="week" ?"bg-yellow-500 text-black shadow-md" :"text-slate-500 hover:text-slate-800"
 }`}
 >
 Weekly
 </button>
 <button
 onClick={() => setPeriod("month")}
 className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
 period ==="month" ?"bg-yellow-500 text-black shadow-md" :"text-slate-500 hover:text-slate-800"
 }`}
 >
 Monthly
 </button>
 </div>
 </div>

 {/* Grid of Trend widgets */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
 {targetCategories.map((cat) => {
 const stats = calculateTrend(cat.key);
 const isUp = stats.pctChange > 0;
 const isDown = stats.pctChange < 0;

 return (
 <div 
 key={cat.key} 
 className="p-4 clay-card p-5 hover:border-slate-200 transition-all flex flex-col justify-between gap-3 relative group overflow-hidden"
 >
 <div className="flex justify-between items-start gap-2">
 <span className="text-xs font-extrabold text-slate-600 group-hover:text-slate-800 transition">
 {cat.label}
 </span>
 <span className="text-[10px] text-slate-500 font-mono">
 {stats.currentCount} active
 </span>
 </div>

 <div className="flex items-baseline gap-1.5 mt-2">
 <span className="text-xl font-black text-slate-800 font-mono">
 {isUp ?"+" :""}{stats.pctChange}%
 </span>

 {/* Animated Arrow Indicators */}
 <div className="flex items-center">
 {isUp && (
 <motion.div
 animate={{ y: [2, -2, 2] }}
 transition={{ repeat: Infinity, duration: 1.5, ease:"easeInOut" }}
 >
 <TrendingUp className="w-4 h-4 text-rose-500" />
 </motion.div>
)}
 {isDown && (
 <motion.div
 animate={{ y: [-2, 2, -2] }}
 transition={{ repeat: Infinity, duration: 1.5, ease:"easeInOut" }}
 >
 <TrendingDown className="w-4 h-4 text-emerald-400" />
 </motion.div>
)}
 {!isUp && !isDown && <Minus className="w-4 h-4 text-slate-500" />}
 </div>
 </div>

 <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] text-slate-500 font-medium">
 <span>{stats.label}</span>
 <span>prev: {stats.previousCount}</span>
 </div>
 </div>
);
 })}
 </div>

 <div className="p-3.5 rounded-xl bg-white/[0.02] border border-slate-200 flex items-start gap-2 text-xs text-slate-500">
 <Info className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
 <p>
 Percentages display relative changes in report volumes against adjacent historical comparative ranges. A rising percentage indicates increased reporting density.
 </p>
 </div>
 </div>
);
}
