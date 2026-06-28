/**
 * @file src/components/admin/AnalyticsCharts.tsx
 * @description Category Analytics and Charts component.
 * Renders custom animated SVG sparklines, rings, and bar graphs summarizing city trends.
 */

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, PieChart, TrendingUp, AlertOctagon } from "lucide-react";
import { CivicReport } from "@/types";

interface AnalyticsChartsProps {
  reports: CivicReport[];
}

export default function AnalyticsCharts({ reports }: AnalyticsChartsProps) {
  const [hoveredData, setHoveredData] = useState<{ label: string; value: number } | null>(null);

  // 1. Reports by Category
  const categoryData: Record<string, number> = {
    road_damage: 0,
    garbage: 0,
    water_leakage: 0,
    street_light: 0,
    drainage: 0,
    illegal_dumping: 0,
    traffic_signal: 0,
    public_safety: 0,
    other: 0,
  };
  reports.forEach((r) => {
    const cat = r.metadata?.category || "other";
    if (categoryData[cat] !== undefined) {
      categoryData[cat]++;
    } else {
      categoryData.other = (categoryData.other || 0) + 1;
    }
  });

  const categories = Object.keys(categoryData).map((key) => ({
    label: key.replace("_", " "),
    value: categoryData[key],
  }));
  const maxCategoryVal = Math.max(...categories.map((c) => c.value), 1);

  // 2. Reports by Department
  const deptData: Record<string, number> = {};
  reports.forEach((r) => {
    const dept = r.ai?.assignment?.department || r.ai?.verification?.assignedDepartment || "Unassigned";
    deptData[dept] = (deptData[dept] || 0) + 1;
  });
  const departments = Object.keys(deptData).map((key) => ({
    label: key,
    value: deptData[key],
  }));
  const maxDeptVal = Math.max(...departments.map((d) => d.value), 1);

  // 3. Reports by Status
  const statusData: Record<string, number> = {
    submitted: 0,
    accepted: 0,
    in_progress: 0,
    resolved: 0,
    rejected: 0,
  };
  reports.forEach((r) => {
    const stat = r.status || "submitted";
    if (statusData[stat] !== undefined) {
      statusData[stat]++;
    }
  });
  const statuses = Object.keys(statusData).map((key) => ({
    label: key === "submitted" ? "Pending Triage" : key === "in_progress" ? "Active Investigation" : key,
    value: statusData[key],
    color: key === "resolved" 
      ? "bg-emerald-500" 
      : key === "in_progress" || key === "accepted"
      ? "bg-blue-500" 
      : key === "submitted" 
      ? "bg-amber-500" 
      : "bg-rose-500",
    strokeColor: key === "resolved" 
      ? "#10b981" 
      : key === "in_progress" || key === "accepted"
      ? "#3b82f6" 
      : key === "submitted" 
      ? "#f59e0b" 
      : "#ef4444",
  }));
  const totalStatusCount = reports.length || 1;

  // 4. Reports by Severity
  const severityData = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  reports.forEach((r) => {
    const sev = String(r.ai?.assistant?.severity || r.ai?.verification?.priority || "Medium").toLowerCase();
    if (sev === "critical") severityData.Critical++;
    else if (sev === "high") severityData.High++;
    else if (sev === "low") severityData.Low++;
    else severityData.Medium++;
  });
  const totalSeverityCount = reports.length || 1;

  // 5. Reports by Day (Last 30 Days) - SVG Area Sparkline
  const getDailyTrend = () => {
    const days: Record<string, number> = {};
    const now = new Date();
    // Pre-populate last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days[d.toDateString()] = 0;
    }

    reports.forEach((r) => {
      const dateStr = new Date(r.timestamps?.createdAt || 0).toDateString();
      if (days[dateStr] !== undefined) {
        days[dateStr]++;
      }
    });

    return Object.keys(days).map((key) => ({
      label: new Date(key).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: days[key],
    }));
  };
  const dailyTrend = getDailyTrend();
  const maxDailyVal = Math.max(...dailyTrend.map((d) => d.value), 1);

  // Generate SVG Path for Daily Sparkline
  const sparkWidth = 500;
  const sparkHeight = 150;
  const points = dailyTrend.map((d, index) => {
    const x = (index / (dailyTrend.length - 1)) * sparkWidth;
    const y = sparkHeight - (d.value / maxDailyVal) * (sparkHeight - 20) - 10;
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
    : "";
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${sparkHeight} L ${points[0].x} ${sparkHeight} Z`
    : "";
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Reports by Category */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md shadow-xl flex flex-col gap-4">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          Incidents by Category Layer
        </h3>
        <div className="space-y-3.5 flex-1 flex flex-col justify-center">
          {categories.map((c) => {
            const pct = Math.round((c.value / maxCategoryVal) * 100);
            return (
              <div key={c.label} className="space-y-1 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="capitalize text-zinc-300">{c.label}</span>
                  <span className="font-mono font-bold text-white">{c.value}</span>
                </div>
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Reports by Department */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md shadow-xl flex flex-col gap-4">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          Division Workload Distribution
        </h3>
        <div className="space-y-3.5 flex-1 flex flex-col justify-center">
          {departments.length === 0 ? (
            <span className="text-xs text-zinc-500 italic text-center py-10">No department logs on record.</span>
          ) : (
            departments.map((d) => {
              const pct = Math.round((d.value / maxDeptVal) * 100);
              return (
                <div key={d.label} className="space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-zinc-300 font-bold">{d.label}</span>
                    <span className="font-mono font-bold text-white">{d.value}</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Reports by Status - Segmented Doughnut Stack */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-4 flex-1">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-400" />
            Registry Operational Status
          </h3>
          <div className="space-y-2.5">
            {statuses.map((s) => {
              const pct = Math.round((s.value / totalStatusCount) * 100);
              return (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                    <span className="capitalize text-zinc-300">{s.label}</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {s.value} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SVG Segmented Ring */}
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90">
            {(() => {
              let cumulativePercent = 0;
              const radius = 50;
              const circum = 2 * Math.PI * radius;

              return statuses.map((s) => {
                const pct = s.value / totalStatusCount;
                const dashArray = `${pct * circum} ${circum}`;
                const dashOffset = -cumulativePercent * circum;
                cumulativePercent += pct;

                if (s.value === 0) return null;

                return (
                  <circle
                    key={s.label}
                    cx="72"
                    cy="72"
                    r={radius}
                    fill="transparent"
                    stroke={s.strokeColor}
                    strokeWidth="10"
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 hover:stroke-[12] cursor-pointer"
                  />
                );
              });
            })()}
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-black text-white font-mono">{reports.length}</span>
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Reports</span>
          </div>
        </div>
      </div>

      {/* 4. Reports by Severity - Stacked Progress */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between gap-4">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-rose-400" />
          Urgency & Severity Index
        </h3>
        <div className="space-y-4">
          {Object.keys(severityData).map((key) => {
            const count = severityData[key as keyof typeof severityData];
            const pct = Math.round((count / totalSeverityCount) * 100);
            const barColor = key === "Critical" 
              ? "bg-rose-500" 
              : key === "High" 
              ? "bg-orange-500" 
              : key === "Medium" 
              ? "bg-blue-500" 
              : "bg-emerald-500";

            return (
              <div key={key} className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider">{key}</span>
                  <span className="font-mono text-zinc-400">{count} reports ({pct}%)</span>
                </div>
                <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <motion.div
                    className={`h-full rounded-full ${barColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Reports by Day (Last 30 Days) - SVG Area Sparkline */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md shadow-xl flex flex-col gap-4 lg:col-span-2">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            30-Day Submissions Frequency
          </h3>
          {hoveredData && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">
              {hoveredData.label}: {hoveredData.value} reports
            </span>
          )}
        </div>

        <div className="relative w-full h-[180px] bg-black/20 rounded-xl border border-white/5 overflow-hidden p-4">
          <svg
            viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="0" y1={sparkHeight / 2} x2={sparkWidth} y2={sparkHeight / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <line x1="0" y1="10" x2={sparkWidth} y2="10" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <line x1="0" y1={sparkHeight - 10} x2={sparkWidth} y2={sparkHeight - 10} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

            {/* Shaded Area */}
            {points.length > 0 && (
              <motion.path
                d={areaD}
                fill="url(#sparkGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
            )}

            {/* Sparkline path */}
            {points.length > 0 && (
              <motion.path
                d={pathD}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
            )}

            {/* Dots */}
            {points.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r="4"
                className="fill-blue-500 stroke-zinc-950 stroke-2 hover:r-6 cursor-pointer transition-all"
                onMouseEnter={() => setHoveredData({ label: p.label, value: p.value })}
                onMouseLeave={() => setHoveredData(null)}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
