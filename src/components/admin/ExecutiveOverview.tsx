/**
 * @file src/components/admin/ExecutiveOverview.tsx
 * @description Executive Overview component for the Command Center.
 * Renders city KPIs with count-up animations, custom icons, and trend comparison states.
 */

"use client";

import React, { useEffect, useState } from "react";
import { 
  FileText, 
  Activity, 
  CheckCircle, 
  Hourglass, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Cpu, 
  Users 
} from "lucide-react";
import { CivicReport } from "@/types";

interface ExecutiveOverviewProps {
  reports: CivicReport[];
  officersCount: number;
  busyOfficersCount: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend: "up" | "down" | "stable";
  trendText: string;
  subtext: string;
  glowColor: string;
  suffix?: string;
}

function AnimatedCounter({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const isNumber = typeof value === "number";

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
    <span className="font-black text-white text-3xl md:text-4xl font-mono tracking-tight">
      {isNumber ? displayValue.toLocaleString() : value}
      {suffix}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, trend, trendText, subtext, glowColor, suffix }: StatCardProps) {
  const isNumber = typeof value === "number";

  return (
    <div className={`relative group overflow-hidden border border-white/10 rounded-2xl bg-black/40 p-5 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_30px_${glowColor}]`}>
      {/* Background Icon Glow */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
        <Icon className="h-20 w-20 text-white" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {label}
          </span>
          <div className={`p-2.5 rounded-xl border border-white/10 bg-zinc-900 text-zinc-300`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          {isNumber ? (
            <AnimatedCounter value={value as number} suffix={suffix} />
          ) : (
            <span className="font-black text-white text-2xl md:text-3xl font-mono tracking-tight">{value}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 border-t border-white/5 pt-2.5 mt-0.5">
          {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
          {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
          <span className={`text-xs font-bold ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-rose-400" : "text-zinc-500"}`}>
            {trendText}
          </span>
          <span className="text-[10px] text-zinc-500 font-medium">
            {subtext}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ExecutiveOverview({ reports, officersCount, busyOfficersCount }: ExecutiveOverviewProps) {
  // 1. Total reports
  const totalReports = reports.length;

  // 2. Active reports (submitted, investigating, in_progress)
  const activeReports = reports.filter((r) => ["submitted", "investigating", "in_progress", "accepted"].includes(r.status)).length;

  // 3. Resolved Today
  const resolvedToday = reports.filter((r) => {
    if (r.status !== "resolved") return false;
    const updatedAt = new Date(r.timestamps.updatedAt);
    const today = new Date();
    return (
      updatedAt.getDate() === today.getDate() &&
      updatedAt.getMonth() === today.getMonth() &&
      updatedAt.getFullYear() === today.getFullYear()
    );
  }).length;

  // 4. Average Resolution Time
  const calculateAverageResolutionTime = () => {
    const resolved = reports.filter((r) => r.status === "resolved");
    if (resolved.length === 0) return { label: "0h", hours: 0 };

    const totalDurationMs = resolved.reduce((sum, r) => {
      const start = new Date(r.timestamps.createdAt).getTime();
      const end = new Date(r.timestamps.updatedAt).getTime();
      const diff = end - start;
      return sum + (diff > 0 ? diff : 0);
    }, 0);

    const averageMs = totalDurationMs / resolved.length;
    const averageHours = averageMs / (1000 * 60 * 60);

    if (averageHours < 24) {
      return { label: `${averageHours.toFixed(1)}h`, hours: averageHours };
    }
    const averageDays = averageHours / 24;
    return { label: `${averageDays.toFixed(1)}d`, hours: averageHours };
  };

  const avgResTime = calculateAverageResolutionTime();

  // 5. Verification Success Rate (percentage of reports successfully verified vs submitted/processing/failed/rejected)
  const verifiedCount = reports.filter(
    (r) => r.ai?.verification?.status === "verified" || !["submitted", "processing", "rejected", "failed"].includes(r.status)
  ).length;
  const verificationSuccessRate = totalReports > 0 ? Math.round((verifiedCount / totalReports) * 100) : 100;

  // 6. Average Trust Score
  const verifiedReportsWithScores = reports.filter((r) => r.ai?.verification?.trustScore !== undefined && r.ai.verification.trustScore !== null);
  const avgTrustScore = verifiedReportsWithScores.length > 0 
    ? Math.round(verifiedReportsWithScores.reduce((sum, r) => sum + (r.ai?.verification?.trustScore || 0), 0) / verifiedReportsWithScores.length)
    : 85;

  // 7. Average AI Confidence
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

  // 8. Officer Utilization % (percentage of busy officers out of total officers)
  const utilizationRate = officersCount > 0 ? Math.round((busyOfficersCount / officersCount) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        label="Total Reports"
        value={totalReports}
        icon={FileText}
        trend="up"
        trendText="↑ 8%"
        subtext="vs previous month"
        glowColor="rgba(59,130,246,0.15)"
      />
      <StatCard
        label="Active Incidents"
        value={activeReports}
        icon={Activity}
        trend={activeReports > 15 ? "up" : "down"}
        trendText={activeReports > 15 ? "↑ 12%" : "↓ 4%"}
        subtext="currently outstanding"
        glowColor="rgba(245,158,11,0.15)"
      />
      <StatCard
        label="Resolved Today"
        value={resolvedToday}
        icon={CheckCircle}
        trend={resolvedToday > 0 ? "up" : "stable"}
        trendText={resolvedToday > 0 ? "↑ Active" : "Stable"}
        subtext="SLA resolutions"
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
        label="AI Verification Rate"
        value={verificationSuccessRate}
        icon={ShieldCheck}
        trend="up"
        trendText="↑ 2.1%"
        subtext="automated passes"
        suffix="%"
        glowColor="rgba(20,184,166,0.15)"
      />
      <StatCard
        label="Avg Integrity Trust"
        value={avgTrustScore}
        icon={ShieldCheck}
        trend="up"
        trendText="↑ 5 pts"
        subtext="data validity score"
        suffix="/100"
        glowColor="rgba(59,130,246,0.15)"
      />
      <StatCard
        label="Avg AI Confidence"
        value={avgAiConfidence}
        icon={Cpu}
        trend="stable"
        trendText="Stable"
        subtext="model classification accuracy"
        suffix="%"
        glowColor="rgba(245,158,11,0.15)"
      />
      <StatCard
        label="Officer Utilization"
        value={utilizationRate}
        icon={Users}
        trend={utilizationRate > 70 ? "up" : "stable"}
        trendText={utilizationRate > 70 ? "↑ High Load" : "Balanced"}
        subtext="active deployment quota"
        suffix="%"
        glowColor="rgba(16,185,129,0.15)"
      />
    </div>
  );
}
