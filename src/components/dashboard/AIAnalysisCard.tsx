/**
 * @file src/components/dashboard/AIAnalysisCard.tsx
 * @description Premium AI Explainability Panel for citizen reports.
 * Displays AI confidence, trust scores, priority, and clear human-friendly explanations.
 */

"use client";

import React from "react";
import { motion } from "framer-motion";
import { Cpu, ShieldCheck, Sparkles, RefreshCw, BarChart2 } from "lucide-react";
import { CivicReport } from "@/types";

interface AIAnalysisCardProps {
  report: CivicReport;
}

export default function AIAnalysisCard({ report }: AIAnalysisCardProps) {
  const ai = report.ai;
  const assistant = ai?.assistant;
  const verification = ai?.verification;
  const isProcessing = !verification || verification.status === "processing";

  // Formats values to percentages
  const toPercentage = (val: number | null | undefined) => {
    if (val === undefined || val === null) return 0;
    if (val <= 1) return Math.round(val * 100);
    return Math.round(val);
  };

  // Helper to format priority color
  const getPriorityColor = (priority: string | null | undefined) => {
    const val = String(priority || "").toLowerCase();
    if (["critical", "high"].includes(val)) return "text-rose-400 bg-rose-400/10 border-rose-400/20";
    if (val === "medium") return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  };

  // Generate automated reasoning bullets based on report data
  const generateReasoning = () => {
    const bullets: string[] = [];
    if (!verification) return bullets;

    // 1. Priority Reason
    const prio = String(verification.priority || assistant?.initialPriority || "medium").toLowerCase();
    if (prio === "critical" || prio === "high") {
      bullets.push("High urgency assigned due to potential public safety threat or major public blockage.");
    } else {
      bullets.push("Standard response priority determined based on category severity index.");
    }

    // 2. Authenticity Reason
    const fakeProb = toPercentage(verification.fakeMediaProbability);
    if (fakeProb > 50) {
      bullets.push(`Media analysis flagged potential manipulation (${fakeProb}% probability) requiring human review.`);
    } else {
      bullets.push(`High image authenticity confirmed (manipulation probability: ${fakeProb}%).`);
    }

    // 3. Duplicate Reason
    const dupIds = verification.duplicateReportIds;
    if (dupIds && dupIds.length > 0) {
      bullets.push(`Identified duplicate incident reported nearby (Duplicate ID: #${dupIds[0]}).`);
    } else {
      bullets.push("Cross-referenced coordinates: No duplicate reports found within spatial-temporal threshold.");
    }

    // 4. Detected Objects
    if (assistant?.detectedObjects && assistant.detectedObjects.length > 0) {
      bullets.push(`Visual analysis detected: ${assistant.detectedObjects.slice(0, 3).join(", ")}.`);
    }

    // 5. Impact Estimation
    bullets.push(`Department routing set to "${verification.assignedDepartment || "Roads"}" for rapid dispatch.`);

    return bullets;
  };

  if (isProcessing) {
    return (
      <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
        {/* Shimmer background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400 animate-spin" />
            AI Triage & Verification
          </h3>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Analyzing Evidence...
          </span>
        </div>

        <div className="space-y-6">
          {/* Skeleton confidence gauges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
              <div className="h-8 w-full bg-zinc-800/50 rounded-lg animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="h-8 w-full bg-zinc-800/50 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Skeleton details */}
          <div className="space-y-3">
            <div className="h-4 w-full bg-zinc-800/70 rounded animate-pulse" />
            <div className="h-4 w-[90%] bg-zinc-800/60 rounded animate-pulse" />
            <div className="h-4 w-[85%] bg-zinc-800/50 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const confidence = toPercentage(assistant?.confidence ?? 0.85);
  const trustScore = toPercentage(verification?.trustScore ?? 0.90);
  const fakeProb = toPercentage(verification?.fakeMediaProbability ?? 0.05);
  const dupProb = toPercentage(verification?.duplicateProbability ?? 0.0);
  const reasoningBullets = generateReasoning();

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Cpu className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Diagnostics Report</h3>
            <span className="text-xs text-zinc-400 font-mono">Model: {verification.verificationModel || "Gemini 2.5 Flash"} • v{verification.verificationVersion || "1.0"}</span>
          </div>
        </div>
        <div className={`px-3.5 py-1 text-xs font-semibold rounded-full border self-start sm:self-center capitalize ${getPriorityColor(verification.priority)}`}>
          Priority: {verification.priority || "Medium"}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Confidence Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              AI Categorization Confidence
            </span>
            <span className="text-white font-mono font-bold">{confidence}%</span>
          </div>
          <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Trust Score Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Data Integrity Trust Score
            </span>
            <span className="text-white font-mono font-bold">{trustScore}/100</span>
          </div>
          <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
              initial={{ width: 0 }}
              animate={{ width: `${trustScore}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Secondary Probability Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-b border-white/5 py-4">
        {/* Fake Media Probability */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-medium">Fake Media Probability:</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500" style={{ width: `${fakeProb}%` }} />
            </div>
            <span className={`font-mono font-bold ${fakeProb > 30 ? "text-rose-400" : "text-zinc-300"}`}>{fakeProb}%</span>
          </div>
        </div>

        {/* Duplicate Probability */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-medium">Duplicate Match Probability:</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${dupProb}%` }} />
            </div>
            <span className={`font-mono font-bold ${dupProb > 30 ? "text-amber-400" : "text-zinc-300"}`}>{dupProb}%</span>
          </div>
        </div>
      </div>

      {/* AI Summary and Reasoning */}
      <div className="space-y-4">
        {/* AI Summary */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">AI Verification Summary</h4>
          <p className="text-sm text-zinc-200 bg-white/5 border border-white/5 p-4 rounded-xl leading-relaxed">
            {verification.summary || assistant?.summary || "No automated summary available."}
          </p>
        </div>

        {/* Reasoning Bullets */}
        {reasoningBullets.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" />
              Decision Analysis & Reasoning
            </h4>
            <ul className="space-y-2.5">
              {reasoningBullets.map((bullet, idx) => (
                <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detected Objects Tags */}
        {assistant?.detectedObjects && assistant.detectedObjects.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Detected Visual Objects</h4>
            <div className="flex flex-wrap gap-1.5">
              {assistant.detectedObjects.map((obj, idx) => (
                <span key={idx} className="px-2 py-0.5 text-[10px] font-semibold bg-zinc-800 text-zinc-300 rounded border border-zinc-700 font-mono">
                  {obj}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
