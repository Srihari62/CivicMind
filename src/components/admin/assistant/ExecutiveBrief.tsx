/**
 * @file src/components/admin/assistant/ExecutiveBrief.tsx
 * @description Renders the premium Executive Brief panel with AI-powered sections.
 */

import React, { useState } from"react";
import { 
 Briefcase, 
 Sparkles, 
 AlertTriangle, 
 Activity, 
 ShieldAlert, 
 Lightbulb, 
 PiggyBank, 
 RefreshCw,
 FileText
} from"lucide-react";
import { askMunicipalAssistant, ExecutiveBriefData } from"@/app/actions/ai.actions";
import { useAuth } from"@/providers/auth-provider";

interface ExecutiveBriefProps {
 forceRefresh: boolean;
 onBriefGenerated?: (brief: ExecutiveBriefData) => void;
}

export const ExecutiveBrief: React.FC<ExecutiveBriefProps> = ({ forceRefresh, onBriefGenerated }) => {
 const { profile } = useAuth();
 const [brief, setBrief] = useState<ExecutiveBriefData | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const handleGenerateBrief = async () => {
 setLoading(true);
 setError(null);
 try {
 const response = await askMunicipalAssistant(profile?.uid ||"", [],"","executive_brief", forceRefresh);
 if (response.success && response.brief) {
 setBrief(response.brief);
 if (onBriefGenerated) {
 onBriefGenerated(response.brief);
 }
 } else {
 setError(response.error ||"Failed to generate brief.");
 }
 } catch (err) {
 setError("An unexpected error occurred while generating the brief.");
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

 const sections = brief ? [
 {
 title:"Overview",
 content: brief.overview,
 icon: <Briefcase className="w-4 h-4 text-blue-400" />,
 borderColor:"border-blue-500/10",
 bgColor:"bg-blue-500/5",
 },
 {
 title:"Critical Issues",
 content: brief.criticalIssues,
 icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
 borderColor:"border-amber-500/10",
 bgColor:"bg-amber-500/5",
 },
 {
 title:"Departments Under Pressure",
 content: brief.departmentsUnderPressure,
 icon: <Activity className="w-4 h-4 text-emerald-400" />,
 borderColor:"border-emerald-500/10",
 bgColor:"bg-emerald-500/5",
 },
 {
 title:"Operational Risks",
 content: brief.operationalRisks,
 icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
 borderColor:"border-red-500/10",
 bgColor:"bg-red-500/5",
 },
 {
 title:"Recommended Actions",
 content: brief.recommendedActions,
 icon: <Lightbulb className="w-4 h-4 text-indigo-400" />,
 borderColor:"border-indigo-500/10",
 bgColor:"bg-indigo-500/5",
 },
 {
 title:"Resource Allocation Suggestions",
 content: brief.resourceAllocationSuggestions,
 icon: <PiggyBank className="w-4 h-4 text-pink-400" />,
 borderColor:"border-pink-500/10",
 bgColor:"bg-pink-500/5",
 },
 ] : [];

 return (
 <div className="flex flex-col gap-6 h-full">
 {/* Header card */}
 <div className="border border-slate-200 rounded-2xl clay-card p-5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
 <FileText className="w-5 h-5 text-red-400" />
 </div>
 <div>
 <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
 Executive Brief Mode
 </h3>
 <p className="text-[10px] text-zinc-450 font-medium">
 Analyze telemetry data to construct a structured operational report.
 </p>
 </div>
 </div>

 <button
 onClick={handleGenerateBrief}
 disabled={loading}
 className="px-4 py-2 text-xs font-bold text-slate-800 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 rounded-xl transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer shadow-lg disabled:opacity-50"
 >
 {loading ? (
 <>
 <RefreshCw className="w-3.5 h-3.5 animate-spin" />
 Synthesizing Brief...
 </>
) : (
 <>
 <Sparkles className="w-3.5 h-3.5" />
 Generate Executive Brief
 </>
)}
 </button>
 </div>

 {/* Loading Skeleton */}
 {loading && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
 {[...Array(6)].map((_, idx) => (
 <div key={idx} className="border border-slate-200 clay-card rounded-xl p-4 h-36 flex flex-col gap-3">
 <div className="flex items-center gap-2">
 <div className="h-5 w-5 rounded bg-slate-100" />
 <div className="h-4 w-28 rounded bg-slate-100" />
 </div>
 <div className="h-2 w-full rounded bg-slate-100" />
 <div className="h-2 w-[90%] rounded bg-slate-100" />
 <div className="h-2 w-[75%] rounded bg-slate-100" />
 </div>
))}
 </div>
)}

 {/* Error state */}
 {error && (
 <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 text-xs text-center font-bold">
 {error}
 </div>
)}

 {/* Generated brief content */}
 {!loading && brief && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {sections.map((sec, idx) => (
 <div
 key={idx}
 className={`border ${sec.borderColor} ${sec.bgColor} rounded-2xl p-4.5 backdrop-blur-sm flex flex-col gap-2 transition-all duration-300 hover:border-slate-200`}
 >
 <div className="flex items-center gap-2">
 <div className="p-1 rounded bg-slate-50 border border-slate-200">
 {sec.icon}
 </div>
 <h4 className="font-extrabold text-[11px] text-zinc-150 uppercase tracking-wider">
 {sec.title}
 </h4>
 </div>
 <p className="text-[11px] text-zinc-350 leading-relaxed font-medium">
 {sec.content}
 </p>
 </div>
))}
 </div>
)}

 {!loading && !brief && !error && (
 <div className="flex-1 flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 rounded-2xl bg-slate-50/10">
 <Sparkles className="w-10 h-10 text-zinc-650 mb-3 animate-pulse" />
 <p className="text-xs text-slate-500 font-bold">
 No Executive Brief generated yet.
 </p>
 <p className="text-[10px] text-zinc-550 mt-1 max-w-xs text-center">
 Click the button above to request a comprehensive operational summary of today&apos;s city metrics.
 </p>
 </div>
)}
 </div>
);
};

export default ExecutiveBrief;
