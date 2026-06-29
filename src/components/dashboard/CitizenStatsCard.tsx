/**
 * @file src/components/dashboard/CitizenStatsCard.tsx
 * @description Stats summary card for citizens.
 * Displays submitted, verified, resolved, in-progress reports, community score, and reporting streaks.
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, CheckCircle, Clock, Award, Flame, Zap, Sparkles, X, History } from "lucide-react";
import { CivicReport } from "@/types";

interface CitizenStatsCardProps {
  reports: CivicReport[];
}

export default function CitizenStatsCard({ reports }: CitizenStatsCardProps) {
  const [showScoreModal, setShowScoreModal] = useState(false);
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
        onClick={() => setShowScoreModal(true)}
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-900/35 via-zinc-950/40 to-zinc-950/45 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between gap-6 cursor-pointer hover:from-blue-900/40 hover:to-zinc-950/50 hover:border-white/20 transition-all select-none group"
        title="View Contribution Score Breakdown"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block group-hover:text-yellow-400 transition-colors">
                Contribution Score
              </span>
              <History className="w-3.5 h-3.5 text-zinc-500 group-hover:text-yellow-400 group-hover:rotate-12 transition-all mr-2" />
            </div>
            <span className="text-3xl font-black text-white font-mono flex items-center gap-2 mt-1">
              <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400/20 group-hover:scale-110 transition-transform" />
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

      {/* Contribution Score History Modal */}
      <AnimatePresence>
        {showScoreModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg border border-white/10 rounded-3xl p-6 bg-zinc-900 shadow-2xl flex flex-col gap-4 max-h-[80vh] overflow-hidden text-left"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
                  <h2 className="text-lg font-bold text-white">Contribution Score History</h2>
                </div>
                <button
                  onClick={() => setShowScoreModal(false)}
                  className="text-zinc-400 hover:text-white transition text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-800"
                >
                  Close
                </button>
              </div>

              <div className="text-xs text-zinc-400 bg-zinc-950/40 p-3 rounded-2xl border border-white/5 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Report Submission Base:</span>
                  <span className="font-mono text-zinc-300 font-bold">+10 PTS / report</span>
                </div>
                <div className="flex justify-between">
                  <span>Report Verification Reward:</span>
                  <span className="font-mono text-zinc-300 font-bold">+20 PTS / report</span>
                </div>
                <div className="flex justify-between">
                  <span>Issue Resolution Bonus:</span>
                  <span className="font-mono text-zinc-300 font-bold">+50 PTS / report</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
                {reports.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs">
                    No reports filed yet. Submit a report to begin earning contribution points.
                  </div>
                ) : (
                  reports.map((report) => {
                    const isVerified = report.ai?.verification?.status === "verified" || !["submitted", "processing", "rejected", "failed"].includes(report.status);
                    const isResolved = report.status === "resolved";
                    const totalReportScore = 10 + (isVerified ? 20 : 0) + (isResolved ? 50 : 0);

                    return (
                      <div
                        key={report.id}
                        className="border border-white/5 rounded-2xl p-4 bg-zinc-950/20 hover:bg-zinc-950/40 transition flex flex-col gap-2"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <span className="font-extrabold text-sm text-zinc-200 truncate">
                            {report.ai?.assistant?.title || report.metadata.title}
                          </span>
                          <span className="text-xs font-black font-mono text-yellow-400 bg-yellow-400/10 border border-yellow-400/10 px-2 py-0.5 rounded">
                            +{totalReportScore} PTS
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 border-t border-white/5 pt-2 text-[11px] text-zinc-400">
                          <div className="flex justify-between">
                            <span className="flex items-center gap-1">🟢 Report Submitted</span>
                            <span className="font-mono text-emerald-400">+10 PTS</span>
                          </div>
                          {isVerified && (
                            <div className="flex justify-between">
                              <span className="flex items-center gap-1">🛡️ AI/Community Verified</span>
                              <span className="font-mono text-emerald-400">+20 PTS</span>
                            </div>
                          )}
                          {isResolved && (
                            <div className="flex justify-between">
                              <span className="flex items-center gap-1">✅ Issue Successfully Resolved</span>
                              <span className="font-mono text-emerald-400">+50 PTS</span>
                            </div>
                          )}
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
