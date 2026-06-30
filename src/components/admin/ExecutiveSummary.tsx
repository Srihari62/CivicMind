/**
 * @file src/components/admin/ExecutiveSummary.tsx
 * @description Gemini-powered Executive Summary widget.
 * Prompts Gemini with today's stats, displaying actionable municipal summaries in a glassmorphic card.
 */

"use client";

import React, { useEffect, useState } from"react";
import { useAuth } from"@/providers/auth-provider";
import { Sparkles, RefreshCw, Layers, ListTodo, Route, Lightbulb } from"lucide-react";
import { getAIExecutiveSummary, ExecutiveSummaryResponse } from"@/app/actions/ai.actions";
import { CivicReport } from"@/types";

interface ExecutiveSummaryProps {
 reports: CivicReport[];
 avgResolutionTime: string;
}

const CACHE_KEY ="civicmind_admin_exec_summary";
const CACHE_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 Hours cache

export default function ExecutiveSummary({ reports, avgResolutionTime }: ExecutiveSummaryProps) {
 const { profile } = useAuth();
 const [summary, setSummary] = useState<ExecutiveSummaryResponse | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // Compute stats for Gemini
 const totalCount = reports.length;
 const activeCount = reports.filter((r) => ["submitted","investigating","in_progress","accepted"].includes(r.status)).length;
 const resolvedTodayCount = reports.filter((r) => {
 if (r.status !=="resolved") return false;
 const updatedAt = new Date(r.timestamps.updatedAt);
 const today = new Date();
 return (
 updatedAt.getDate() === today.getDate() &&
 updatedAt.getMonth() === today.getMonth() &&
 updatedAt.getFullYear() === today.getFullYear()
);
 }).length;
 const pendingCount = reports.filter((r) => r.status ==="submitted").length;

 const verifiedCount = reports.filter(
 (r) => r.ai?.verification?.status ==="verified" || !["submitted","processing","rejected","failed"].includes(r.status)
).length;
 const verificationSuccessRate = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 100;

 const verifiedReportsWithScores = reports.filter((r) => r.ai?.verification?.trustScore !== undefined && r.ai?.verification?.trustScore !== null);
 const avgTrustScore = verifiedReportsWithScores.length > 0 
 ? Math.round(verifiedReportsWithScores.reduce((sum, r) => sum + (r.ai?.verification?.trustScore || 0), 0) / verifiedReportsWithScores.length)
 : 85;

 const reportsWithConfidence = reports.filter((r) => r.ai?.assistant?.confidence !== undefined && r.ai?.assistant?.confidence !== null);
 const avgAiConfidence = reportsWithConfidence.length > 0
 ? Math.round(
 (reportsWithConfidence.reduce((sum, r) => {
 const confidence = r.ai?.assistant?.confidence ?? 0;
 return sum + (confidence <= 1 ? confidence * 100 : confidence);
 }, 0) /
 reportsWithConfidence.length)
)
 : 90;

 // Breakdown of categories and departments
 const categoryBreakdown: Record<string, number> = {};
 const deptBreakdown: Record<string, number> = {};

 reports.forEach((r) => {
 const cat = r.metadata?.category ||"other";
 categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;

 const dept = r.ai?.assignment?.department || r.ai?.verification?.assignedDepartment ||"Unassigned";
 deptBreakdown[dept] = (deptBreakdown[dept] || 0) + 1;
 });

 const fetchSummary = async (force = false) => {
 setLoading(true);
 setError(null);
 try {
 if (!force) {
 // Check localStorage cache
 const cached = localStorage.getItem(CACHE_KEY);
 if (cached) {
 const parsed = JSON.parse(cached);
 const age = Date.now() - parsed.timestamp;
 if (age < CACHE_EXPIRY_MS) {
 setSummary(parsed.data);
 setLoading(false);
 return;
 }
 }
 }

 const statsPayload = {
 totalCount,
 activeCount,
 resolvedTodayCount,
 pendingCount,
 avgResTime: avgResolutionTime,
 verificationSuccessRate,
 avgTrustScore,
 avgAiConfidence,
 categoryBreakdown,
 deptBreakdown,
 };

 const result = await getAIExecutiveSummary(profile?.uid ||"", statsPayload);
 setSummary(result);
 
 // Save cache
 localStorage.setItem(
 CACHE_KEY,
 JSON.stringify({
 timestamp: Date.now(),
 data: result,
 })
);
 } catch (err) {
 console.error("Failed to generate AI summary:", err);
 setError("AI generation failed. Displaying municipal failover report.");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 if (reports.length > 0) {
 fetchSummary();
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [reports.length]);

 return (
 <div className="w-full clay-card p-6 space-y-6 relative overflow-hidden">
 {/* Header */}
 <div className="flex items-center justify-between border-b border-slate-200 pb-4">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
 <Sparkles className="w-5 h-5 text-yellow-400" />
 </div>
 <div>
 <h3 className="text-lg font-bold text-slate-800">AI Executive Command Summary</h3>
 <span className="text-xs text-slate-500 font-mono">Gemini-powered live municipal briefing</span>
 </div>
 </div>
 <button
 onClick={() => fetchSummary(true)}
 disabled={loading}
 className="p-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition disabled:opacity-40"
 title="Regenerate Report"
 >
 <RefreshCw className={`w-4 h-4 ${loading ?"animate-spin" :""}`} />
 </button>
 </div>

 {loading ? (
 <div className="space-y-4 py-8 animate-pulse">
 <div className="h-4 w-full bg-slate-200 rounded" />
 <div className="h-4 w-[90%] bg-slate-200 rounded" />
 <div className="h-4 w-[95%] bg-slate-200 rounded" />
 <div className="h-4 w-[85%] bg-slate-200 rounded" />
 </div>
) : error || !summary ? (
 <div className="text-sm text-slate-500 italic py-4">
 Failed to load AI operational brief. Verify Gemini keys are correctly loaded.
 </div>
) : (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
 {/* Daily summary & Emerging Issues */}
 <div className="space-y-5">
 <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
 <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block flex items-center gap-1.5">
 <Layers className="w-3.5 h-3.5" />
 Operational Status Brief
 </span>
 <p className="text-slate-700 leading-relaxed">
 {summary.dailySummary}
 </p>
 </div>

 <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
 <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block flex items-center gap-1.5">
 <ListTodo className="w-3.5 h-3.5" />
 Emerging Hotspots & Issues
 </span>
 <p className="text-slate-700 leading-relaxed">
 {summary.emergingIssues}
 </p>
 </div>
 </div>

 {/* Department Loads & Strategic Planning */}
 <div className="space-y-5">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
 <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block flex items-center gap-1">
 <Route className="w-3 h-3" /> Peak Division
 </span>
 <span className="font-extrabold text-slate-800 text-base block">
 {summary.highestLoadDepartments}
 </span>
 </div>

 <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
 <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block flex items-center gap-1">
 <Lightbulb className="w-3 h-3" /> Budget Allocation
 </span>
 <span className="font-bold text-slate-600 text-xs block leading-relaxed">
 {summary.suggestedResourceAllocation}
 </span>
 </div>
 </div>

 <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-500/10 space-y-2">
 <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block">
 Executive Action Recommendations
 </span>
 <p className="text-slate-700 leading-relaxed text-xs">
 {summary.operationalRecommendations}
 </p>
 </div>
 </div>
 </div>
)}
 </div>
);
}
