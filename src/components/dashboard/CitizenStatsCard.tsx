/**
 * @file src/components/dashboard/CitizenStatsCard.tsx
 * @description Stats summary card for citizens.
 * Displays submitted, verified, resolved, in-progress reports, community score, and reporting streaks.
 */

"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileText, CheckCircle, Clock, Award, Flame, Zap } from "lucide-react";
import { CivicReport } from "@/types";

interface CitizenStatsCardProps {
  reports: CivicReport[];
}

export default function CitizenStatsCard({ reports }: CitizenStatsCardProps) {
  const totalSubmitted = reports.length;
  
  const totalVerified = reports.filter(
    (r) => r.ai?.verification?.status === "verified" || !["submitted", "processing", "rejected", "failed"].includes(r.status)
  ).length;

  const totalResolved = reports.filter((r) => r.status === "resolved").length;
  
  const totalInProgress = reports.filter(
    (r) => ["accepted", "in_progress"].includes(r.status)
  ).length;

  // Compute Community Contribution Score:
  // 10 pts per submission, 20 pts per verification, 50 pts per resolved report.
  const contributionScore = (totalSubmitted * 10) + (totalVerified * 20) + (totalResolved * 50);

  // Compute Reporting Streak (consecutive days)
  const calculateStreak = () => {
    if (reports.length === 0) return 0;
    const dates = reports
      .map((r) => r.timestamps?.createdAt ? new Date(r.timestamps.createdAt).toDateString() : "")
      .filter(Boolean);
    
    const uniqueDates = Array.from(new Set(dates)).map((d) => new Date(d).getTime());
    uniqueDates.sort((a, b) => b - a); // Newest first

    let streak = 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestReportDate = new Date(uniqueDates[0]);
    latestReportDate.setHours(0, 0, 0, 0);

    // If the latest report is older than yesterday, streak is broken (0)
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

  const statItems = [
    {
      label: "Reports Submitted",
      value: totalSubmitted,
      icon: FileText,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Verified Reports",
      value: totalVerified,
      icon: Award,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      label: "Reports In Progress",
      value: totalInProgress,
      icon: Clock,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Resolved Reports",
      value: totalResolved,
      icon: CheckCircle,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-md shadow-lg flex items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                  {item.label}
                </span>
                <span className="text-2xl font-black text-white font-mono block">
                  {item.value}
                </span>
              </div>
              <div className={`p-3 rounded-xl border ${item.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Right side: Streak & Contribution Score */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-900/35 via-zinc-950/40 to-zinc-950/45 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between gap-6"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Contribution Score
            </span>
            <span className="text-3xl font-black text-white font-mono flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400/20" />
              {contributionScore}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-amber-400">
            <Flame className="w-4 h-4 fill-amber-500/20" />
            <span className="text-xs font-black font-mono">{streak} Day Streak</span>
          </div>
        </div>

        <div className="text-xs text-zinc-400 space-y-1.5 border-t border-white/5 pt-4">
          <span className="font-bold text-zinc-300">Level: Active Citizen Guardian</span>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-amber-500" 
              style={{ width: `${Math.min(100, (contributionScore / 500) * 100)}%` }} 
            />
          </div>
          <span className="block text-[10px] text-zinc-500 text-right">
            {contributionScore} / 500 XP to next tier
          </span>
        </div>
      </motion.div>
    </div>
  );
}
