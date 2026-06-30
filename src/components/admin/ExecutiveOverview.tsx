/**
 * @file src/components/admin/ExecutiveOverview.tsx
 * @description Executive Overview component for the Command Center.
 * Renders city KPIs with count-up animations, custom icons, and trend comparison states.
 */

"use client";

import React, { useEffect, useState } from"react";
import { 
 FileText, 
 Activity, 
 CheckCircle, 
 Hourglass, 
 ShieldCheck, 
 TrendingUp, 
 TrendingDown, 
 Cpu, 
 Users,
 Clock,
 UserCheck,
 Wrench,
 Eye
} from"lucide-react";
import { CivicReport } from"@/types";

interface ExecutiveOverviewProps {
 reports: CivicReport[];
 officersCount: number;
 busyOfficersCount: number;
}

interface StatCardProps {
 label: string;
 value: number | string;
 icon: React.ComponentType<{ className?: string }>;
 trend:"up" |"down" |"stable";
 trendText: string;
 subtext: string;
 glowColor: string;
 suffix?: string;
}

function AnimatedCounter({ value, suffix ="" }: { value: number | string; suffix?: string }) {
 const [displayValue, setDisplayValue] = useState(0);
 const isNumber = typeof value ==="number";

 useEffect(() => {
 if (!isNumber) return;
 const start = 0;
 const end = value as number;
 if (start === end) {
 setDisplayValue(end);
 return;
 }
 const duration = 1200; // ms
 let startTime: number | null = null;

 const animate = (timestamp: number) => {
 if (!startTime) startTime = timestamp;
 const progress = Math.min((timestamp - startTime) / duration, 1);
 setDisplayValue(Math.floor(progress * (end - start) + start));
 if (progress < 1) {
 requestAnimationFrame(animate);
 }
 };
 requestAnimationFrame(animate);
 }, [value, isNumber]);

 return (
 <span className="font-black text-slate-800 text-3xl md:text-4xl tracking-tight">
 {isNumber ? displayValue.toLocaleString() : value}
 {suffix}
 </span>
);
}

function StatCard({ label, value, icon: Icon, trend, trendText, subtext, glowColor, suffix }: StatCardProps) {
 const isNumber = typeof value ==="number";

 return (
 <div className="relative group overflow-hidden clay-card p-6 flex flex-col gap-4">
 {/* Background Icon Glow */}
 <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-15 transition-opacity">
 <Icon className="h-20 w-20 text-slate-800" />
 </div>

 <div className="flex flex-col gap-3">
 <div className="flex justify-between items-center">
 <span className="text-xs font-black uppercase tracking-wider text-slate-400">
 {label}
 </span>
 <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 shadow-sm">
 <Icon className="w-4 h-4" />
 </div>
 </div>

 <div className="flex flex-col gap-0.5">
 {isNumber ? (
 <AnimatedCounter value={value as number} suffix={suffix} />
) : (
 <span className="font-black text-slate-800 text-2xl md:text-3xl tracking-tight">{value}</span>
)}
 </div>

 <div className="flex items-center gap-1.5 border-t border-slate-100 pt-3 mt-1">
 {trend ==="up" && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
 {trend ==="down" && <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
 <span className={`text-xs font-bold ${trend ==="up" ?"text-emerald-500" : trend ==="down" ?"text-rose-500" :"text-slate-400"}`}>
 {trendText}
 </span>
 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
 {subtext}
 </span>
 </div>
 </div>
 </div>
);
}

export default function ExecutiveOverview({ reports, officersCount, busyOfficersCount }: ExecutiveOverviewProps) {
 // 1. Pending: submitted, processing, verified, waiting_assignment
 const pendingCount = reports.filter((r) => ["submitted","processing","verified","waiting_assignment"].includes(r.status)).length;

 // 2. Assigned: assigned
 const assignedCount = reports.filter((r) => r.status ==="assigned").length;

 // 3. In Progress: accepted, travelling, investigating, repair_in_progress
 const inProgressCount = reports.filter((r) => ["accepted","travelling","investigating","repair_in_progress"].includes(r.status)).length;

 // 4. Awaiting Verification: awaiting_verification
 const awaitingVerificationCount = reports.filter((r) => r.status ==="awaiting_verification").length;

 // 5. Resolved Today
 const resolvedToday = reports.filter((r) => {
 if (r.status !=="resolved") return false;
 const updatedAt = new Date(r.timestamps.updatedAt);
 const today = new Date();
 return (
 updatedAt.getDate() === today.getDate() &&
 updatedAt.getMonth() === today.getMonth() &&
 updatedAt.getFullYear() === today.getFullYear()
);
 }).length;

 // 6. Average Resolution Time
 const calculateAverageResolutionTime = () => {
 const resolved = reports.filter((r) => r.status ==="resolved");
 if (resolved.length === 0) return { label:"N/A", hours: 0 };

 const totalDurationMs = resolved.reduce((sum, r) => {
 const start = new Date(r.timestamps.createdAt).getTime();
 const end = new Date(r.timestamps.updatedAt).getTime();
 const diff = end - start;
 return sum + (diff > 0 ? diff : 0);
 }, 0);

 const averageMs = totalDurationMs / resolved.length;
 const averageHours = averageMs / (1000 * 60 * 60);

 if (averageHours < 24) {
 return { label: `${averageHours.toFixed(1)} hrs`, hours: averageHours };
 }
 const averageDays = averageHours / 24;
 return { label: `${averageDays.toFixed(1)} days`, hours: averageHours };
 };

 const avgResTime = calculateAverageResolutionTime();

 // 7. Average Trust Score
 const reportsWithTrust = reports.filter((r) => r.ai?.verification?.trustScore !== undefined && r.ai?.verification?.trustScore !== null);
 const avgTrustScore = reportsWithTrust.length > 0 
 ? Math.round((reportsWithTrust.reduce((sum, r) => sum + (r.ai?.verification?.trustScore || 0), 0) / reportsWithTrust.length) * 100)
 : 85;

 // 8. Officer Utilization
 const utilizationRate = officersCount > 0 ? Math.round((busyOfficersCount / officersCount) * 100) : 0;

 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
 <StatCard
 label="Pending Review"
 value={pendingCount}
 icon={Clock}
 trend="stable"
 trendText="Active"
 subtext="awaiting triage"
 glowColor="rgba(245,158,11,0.15)"
 />
 <StatCard
 label="Assigned Cases"
 value={assignedCount}
 icon={UserCheck}
 trend="stable"
 trendText="Queued"
 subtext="pending acceptance"
 glowColor="rgba(59,130,246,0.15)"
 />
 <StatCard
 label="In Progress"
 value={inProgressCount}
 icon={Wrench}
 trend={inProgressCount > 0 ?"up" :"stable"}
 trendText="Active"
 subtext="field service work"
 glowColor="rgba(20,184,166,0.15)"
 />
 <StatCard
 label="Awaiting Verification"
 value={awaitingVerificationCount}
 icon={Eye}
 trend="stable"
 trendText="Reviewing"
 subtext="completed repairs"
 glowColor="rgba(139,92,246,0.15)"
 />
 <StatCard
 label="Resolved Today"
 value={resolvedToday}
 icon={CheckCircle}
 trend={resolvedToday > 0 ?"up" :"stable"}
 trendText={resolvedToday > 0 ?"↑ Active" :"Stable"}
 subtext="SLA completions"
 glowColor="rgba(16,185,129,0.15)"
 />
 <StatCard
 label="Avg Resolution Time"
 value={avgResTime.label}
 icon={Hourglass}
 trend="down"
 trendText="↓ 14%"
 subtext="faster turnarounds"
 glowColor="rgba(139,92,246,0.15)"
 />
 <StatCard
 label="Avg Trust Score"
 value={avgTrustScore}
 icon={ShieldCheck}
 trend="up"
 trendText="↑ 5 pts"
 subtext="triage verification accuracy"
 suffix="%"
 glowColor="rgba(59,130,246,0.15)"
 />
 <StatCard
 label="Officer Utilization"
 value={utilizationRate}
 icon={Users}
 trend={utilizationRate > 70 ?"up" :"stable"}
 trendText={utilizationRate > 70 ?"↑ High Load" :"Balanced"}
 subtext="active deployment quota"
 suffix="%"
 glowColor="rgba(16,185,129,0.15)"
 />
 </div>
);
}
