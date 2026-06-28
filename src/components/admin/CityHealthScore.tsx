/**
 * @file src/components/admin/CityHealthScore.tsx
 * @description City Health Score visualizer for the Command Center.
 * Renders an animated SVG radial circular gauge indicating real-time municipal health indexes.
 */

"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Heart, AlertTriangle, Skull } from "lucide-react";
import { CivicReport } from "@/types";

interface CityHealthScoreProps {
  reports: CivicReport[];
}

export default function CityHealthScore({ reports }: CityHealthScoreProps) {
  const [score, setScore] = useState(0);

  // Constants
  const total = reports.length;
  const resolved = reports.filter((r) => r.status === "resolved").length;
  const pending = reports.filter((r) => r.status === "submitted").length;
  const highPriorityBacklog = reports.filter((r) => 
    ["critical", "high"].includes(String(r.ai?.verification?.priority || r.ai?.assistant?.initialPriority || "").toLowerCase()) &&
    r.status !== "resolved"
  ).length;

  // Average trust score
  const verifiedReports = reports.filter((r) => r.ai?.verification?.trustScore !== undefined && r.ai?.verification?.trustScore !== null);
  const avgTrust = verifiedReports.length > 0
    ? verifiedReports.reduce((sum, r) => sum + (r.ai?.verification?.trustScore || 0), 0) / verifiedReports.length
    : 85;

  // Calculate health score deterministically (between 0 and 100)
  useEffect(() => {
    if (total === 0) {
      setScore(90); // default baseline score if empty
      return;
    }

    // 1. Resolution factor (up to 35 points)
    const resolutionRate = resolved / total;
    const resPoints = resolutionRate * 35;

    // 2. Trust factor (up to 25 points)
    const trustPoints = (avgTrust / 100) * 25;

    // 3. Pending backlog penalty (up to 20 points, starts full and drops by 2 points per pending incident)
    const pendingPenalty = Math.min(20, pending * 1.5);
    const pendingPoints = Math.max(0, 20 - pendingPenalty);

    // 4. High priority penalty (up to 20 points, drops by 4 points per critical backlog incident)
    const priorityPenalty = Math.min(20, highPriorityBacklog * 3);
    const priorityPoints = Math.max(0, 20 - priorityPenalty);

    const calculatedScore = Math.min(100, Math.round(resPoints + trustPoints + pendingPoints + priorityPoints));
    setScore(calculatedScore);
  }, [total, resolved, pending, avgTrust, highPriorityBacklog]);

  // Determine status details
  const getStatusDetails = (scoreVal: number) => {
    if (scoreVal >= 90) {
      return {
        label: "Excellent",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        glow: "rgba(16,185,129,0.3)",
        icon: Heart,
        desc: "All urban utility metrics are performing outstandingly. SLAs are met within targets."
      };
    }
    if (scoreVal >= 75) {
      return {
        label: "Good",
        color: "text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20",
        glow: "rgba(59,130,246,0.3)",
        icon: ShieldCheck,
        desc: "City systems are healthy. Response times are balanced, but minor category queues remain."
      };
    }
    if (scoreVal >= 60) {
      return {
        label: "Needs Attention",
        color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
        glow: "rgba(245,158,11,0.3)",
        icon: AlertTriangle,
        desc: "Backlogs detected in multiple departments. Resolution timelines require optimization."
      };
    }
    return {
      label: "Critical",
      color: "text-rose-500",
      bg: "bg-rose-500/10 border-rose-500/20",
      glow: "rgba(239,68,68,0.3)",
      icon: Skull,
      desc: "Severe backlog queues and high priority complaints active. Reallocate active dispatches."
    };
  };

  const status = getStatusDetails(score);
  const StatusIcon = status.icon;

  // Circular gauge mathematics
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
      {/* Background radial gradient */}
      <div 
        className="absolute -right-24 -bottom-24 w-64 h-64 rounded-full blur-[100px] opacity-15 transition-all duration-700 group-hover:scale-110" 
        style={{ backgroundColor: status.glow }}
      />

      <div className="flex-1 flex flex-col gap-4 text-center md:text-left">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            System Index
          </span>
          <h3 className="text-xl font-extrabold text-white flex items-center justify-center md:justify-start gap-2">
            City Operational Health Score
          </h3>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${status.color} ${status.bg}`}>
              {status.label}
            </span>
          </div>
          <p className="text-sm text-zinc-300 max-w-md leading-relaxed">
            {status.desc}
          </p>
        </div>

        <span className="text-xs text-zinc-500 mt-2 font-mono">
          *Calculated from {resolved}/{total} resolved files, {pending} pending reports, and {highPriorityBacklog} priority backlogs.
        </span>
      </div>

      {/* Circular Gauge */}
      <div className="flex flex-col items-center justify-center gap-3 shrink-0">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            {/* Background Circle */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              className="stroke-zinc-800"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress Circle */}
            <motion.circle
              cx="72"
              cy="72"
              r={radius}
              className={`stroke-current ${status.color}`}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white font-mono tracking-tighter">
              {score}
            </span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
              Health Index
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
          <StatusIcon className={`w-4 h-4 ${status.color}`} />
          City health index score: {score}%
        </div>
      </div>
    </div>
  );
}
