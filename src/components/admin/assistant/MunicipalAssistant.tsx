/**
 * @file src/components/admin/assistant/MunicipalAssistant.tsx
 * @description Main dashboard wrapper for the AI Municipal Assistant.
 */

import React, { useState, useMemo } from"react";
import { CivicReport } from"@/types";
import { FirestoreUserProfile } from"@/features/auth/repositories/user.repository";
import { AnalyticsService } from"@/services/analytics/analytics.service";
import AssistantChat from"./AssistantChat";
import ExecutiveBrief from"./ExecutiveBrief";
import { 
 Building2, 
 MapPin, 
 Users, 
 Activity, 
 Clock, 
 ShieldCheck, 
 AlertTriangle,
 FileText
} from"lucide-react";

interface MunicipalAssistantProps {
 reports: CivicReport[];
 users: FirestoreUserProfile[];
}

export const MunicipalAssistant: React.FC<MunicipalAssistantProps> = ({ reports, users }) => {
 const [activeTab, setActiveTab] = useState<"dept_health" |"hotspots_officers" |"executive_brief">("dept_health");

 // Compute analytics client-side to render local UI instantly
 const analytics = useMemo(() => {
 return AnalyticsService.calculateAnalytics(reports, users);
 }, [reports, users]);

 if (!reports || reports.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-24 border border-dashed border-slate-200 rounded-2xl clay-card">
 <AlertTriangle className="w-10 h-10 text-amber-500 mb-3 animate-bounce" />
 <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
 Insufficient data available.
 </h3>
 <p className="text-[11px] text-slate-500 mt-1 max-w-xs text-center">
 The municipal databases are currently empty. Please submit reports or register officers to populate the analytics telemetry.
 </p>
 </div>
);
 }

 // Predefined prompt pre-fill triggers to help administrators query departments
 const handleScorecardClick = (deptName: string) => {
 console.info("Scorecard clicked for department:", deptName);
 };

 return (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
 {/* Column 1: AI Assistant Chat Panel */}
 <div className="lg:col-span-5 flex flex-col">
 <AssistantChat forceRefresh={false} />
 </div>

 {/* Column 2: Dashboard Visual Analytics Telemetry */}
 <div className="lg:col-span-7 flex flex-col gap-6">
 {/* Sub-Navigation Tabs */}
 <div className="flex border-b border-slate-200 gap-4">
 <button
 onClick={() => setActiveTab("dept_health")}
 className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
 activeTab ==="dept_health"
 ?"border-red-500 text-red-400"
 :"border-transparent text-zinc-450 hover:text-slate-600"
 }`}
 >
 <Building2 className="w-3.5 h-3.5" /> Department Health
 </button>
 
 <button
 onClick={() => setActiveTab("hotspots_officers")}
 className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
 activeTab ==="hotspots_officers"
 ?"border-red-500 text-red-400"
 :"border-transparent text-zinc-450 hover:text-slate-600"
 }`}
 >
 <MapPin className="w-3.5 h-3.5" /> Hotspots & Officers
 </button>

 <button
 onClick={() => setActiveTab("executive_brief")}
 className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
 activeTab ==="executive_brief"
 ?"border-red-500 text-red-400"
 :"border-transparent text-zinc-450 hover:text-slate-600"
 }`}
 >
 <FileText className="w-3.5 h-3.5" /> Executive Brief
 </button>
 </div>

 {/* Tab contents */}
 <div className="flex-1">
 {activeTab ==="dept_health" && (
 <div className="space-y-6">
 {/* Scorecard Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {Object.values(analytics.departments).map((dept) => (
 <div
 key={dept.name}
 onClick={() => handleScorecardClick(dept.name)}
 className="border border-slate-200 clay-card rounded-2xl p-4.5 flex flex-col gap-3 transition-all duration-300 hover:border-red-500/20 hover:bg-slate-100/20 cursor-pointer group"
 title={`Click to copy: Explain ${dept.name} department health`}
 >
 {/* Header */}
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-2">
 <Building2 className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
 <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
 {dept.name}
 </span>
 </div>
 <span className="text-[9px] font-bold text-slate-500 group-hover:text-zinc-350 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
 {dept.totalCount} Reports
 </span>
 </div>

 {/* Scorecard KPIs */}
 <div className="grid grid-cols-3 gap-2 text-center border-t border-b border-slate-200 py-2 my-1 text-xs">
 <div>
 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending</div>
 <div className="font-bold font-mono text-slate-700 mt-0.5">{dept.pendingReports}</div>
 </div>
 <div>
 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Backlog</div>
 <div className="font-bold font-mono text-slate-700 mt-0.5">{dept.backlogSize}</div>
 </div>
 <div>
 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Workload</div>
 <div className="font-bold font-mono text-slate-700 mt-0.5">{dept.workload}</div>
 </div>
 </div>

 {/* Footer performance metrics */}
 <div className="flex justify-between items-center text-[10px] text-zinc-450 font-semibold">
 <span className="flex items-center gap-1">
 <Clock className="w-3 h-3 text-indigo-400" />
 Avg SLA: <strong className="font-mono text-slate-600">{dept.averageResolutionTime > 0 ? `${dept.averageResolutionTime}h` :"N/A"}</strong>
 </span>
 <span className="flex items-center gap-1">
 <ShieldCheck className="w-3 h-3 text-emerald-400" />
 Trust: <strong className="font-mono text-slate-600">{dept.trustScoreAverage > 0 ? `${dept.trustScoreAverage}%` :"N/A"}</strong>
 </span>
 </div>
 </div>
))}
 </div>

 {/* General Health Explanation Box */}
 <div className="border border-slate-200 bg-slate-100/30 rounded-2xl p-4 flex gap-3 items-start backdrop-blur-sm">
 <Activity className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
 <div>
 <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
 Scorecard Intelligence Guide
 </h4>
 <p className="text-[10px] text-slate-500 leading-relaxed mt-1 font-medium">
 The department scorecard tracks operational efficiency in real-time. 
 <strong> Workload</strong> reflects unresolved incidents assigned to the division. 
 <strong> Avg SLA</strong> indicates the average time elapsed from ticket submission to official resolution. 
 Ask the AI Assistant <em>&quot;Summarize Roads department health&quot;</em> to receive deep contextual analysis.
 </p>
 </div>
 </div>
 </div>
)}

 {activeTab ==="hotspots_officers" && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Hotspots Intelligence list */}
 <div className="border border-slate-200 clay-card rounded-2xl p-5 flex flex-col gap-4">
 <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
 <MapPin className="w-4 h-4 text-rose-400" />
 <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
 Top Problem Areas
 </span>
 </div>
 {analytics.hotspots.length === 0 ? (
 <p className="text-[10px] text-slate-500 text-center py-6 font-bold">No hotspots identified yet.</p>
) : (
 <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1">
 {analytics.hotspots.slice(0, 6).map((spot, idx) => (
 <div key={idx} className="flex justify-between items-start gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-100/20 text-xs hover:border-red-500/10 transition-all">
 <div className="flex flex-col gap-0.5">
 <span className="font-extrabold text-slate-700 line-clamp-1">{spot.locality}</span>
 <span className="text-[9px] font-mono text-slate-500">
 Lat: {spot.latitude.toFixed(4)}, Lng: {spot.longitude.toFixed(4)}
 </span>
 <div className="flex flex-wrap gap-1 mt-1.5">
 {Object.entries(spot.categories).map(([cat, cnt]) => (
 <span key={cat} className="text-[8px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded-full capitalize">
 {cat.replace("_","")}: {cnt}
 </span>
))}
 </div>
 </div>
 <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded font-mono shrink-0">
 {spot.count} cases
 </span>
 </div>
))}
 </div>
)}
 </div>

 {/* Officer Analytics list */}
 <div className="border border-slate-200 clay-card rounded-2xl p-5 flex flex-col gap-4">
 <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
 <Users className="w-4 h-4 text-purple-400" />
 <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
 Officer Workload Telemetry
 </span>
 </div>
 {analytics.officers.length === 0 ? (
 <p className="text-[10px] text-slate-500 text-center py-6 font-bold">No officers available.</p>
) : (
 <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1">
 {analytics.officers.map((off) => (
 <div key={off.uid} className="flex justify-between items-center p-2.5 rounded-xl border border-slate-200 bg-slate-100/20 text-xs hover:border-red-500/10 transition-all">
 <div className="flex flex-col gap-0.5">
 <span className="font-extrabold text-slate-700 line-clamp-1">{off.name}</span>
 <span className="text-[9px] text-slate-500 font-semibold">{off.department}</span>
 <span className="text-[9px] text-slate-500 flex items-center gap-1.5 font-medium mt-1">
 Resolved: <strong className="font-mono text-slate-600 font-extrabold">{off.resolvedCount}</strong>
 {off.averageResolutionTime > 0 && (
 <>
 | Avg SLA: <strong className="font-mono text-slate-600 font-extrabold">{off.averageResolutionTime}h</strong>
 </>
)}
 </span>
 </div>
 <div className="flex flex-col items-end gap-1.5 shrink-0">
 <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${
 off.availability ==="available"
 ?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
 : off.availability ==="busy"
 ?"bg-amber-500/10 text-amber-400 border-amber-500/20"
 :"bg-slate-100 text-slate-500 border-slate-200"
 }`}>
 {off.availability}
 </span>
 <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded font-mono">
 {off.activeCases} active
 </span>
 </div>
 </div>
))}
 </div>
)}
 </div>
 </div>
)}

 {activeTab ==="executive_brief" && (
 <ExecutiveBrief forceRefresh={false} />
)}
 </div>
 </div>
 </div>
);
};

export default MunicipalAssistant;
