/**
 * @file src/components/admin/PredictiveInsights.tsx
 * @description Gemini-powered Predictive Insights component for SPRINT 10.
 * Utilizes the getAIPredictiveInsights server action to detect geospatial clusters and offer inspection recommendations.
 */

"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { BrainCircuit, RefreshCw, Target } from "lucide-react";
import { getAIPredictiveInsights, PredictiveInsight } from "@/app/actions/ai.actions";
import { CivicReport } from "@/types";

interface PredictiveInsightsProps {
  reports: CivicReport[];
}

const CACHE_KEY = "civicmind_admin_predictive_insights";
const CACHE_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 Hours cache

export default function PredictiveInsights({ reports }: PredictiveInsightsProps) {
  const { profile } = useAuth();
  const [insights, setInsights] = useState<PredictiveInsight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      if (!force) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const age = Date.now() - parsed.timestamp;
          if (age < CACHE_EXPIRY_MS) {
            setInsights(parsed.data);
            setLoading(false);
            return;
          }
        }
      }

      // Map reports down to a lean format for Gemini token reduction
      const reportsLean = reports.slice(0, 45).map((r) => ({
        id: r.id,
        category: r.metadata?.category || "other",
        dept: r.ai?.assignment?.department || r.ai?.verification?.assignedDepartment || "Unassigned",
        lat: r.location?.latitude || 0,
        lng: r.location?.longitude || 0,
        created: r.timestamps?.createdAt || "",
      }));

      const result = await getAIPredictiveInsights(profile?.uid || "", reportsLean);
      setInsights(result);

      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          data: result,
        })
      );
    } catch (err) {
      console.error("Failed to generate predictive insights:", err);
      setError("AI generation failed. Fallback operational plan loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reports.length > 0) {
      fetchInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports.length]);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md shadow-2xl space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Predictive Intelligence Panel</h3>
            <span className="text-xs text-zinc-400">Gemini model identification of recurring urban hazard models</span>
          </div>
        </div>
        <button
          onClick={() => fetchInsights(true)}
          disabled={loading}
          className="p-2 rounded-xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition disabled:opacity-40"
          title="Refresh Analysis"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-xl border border-white/5 bg-white/[0.01] animate-pulse space-y-4">
              <div className="h-4 w-1/2 bg-zinc-800 rounded" />
              <div className="h-3 w-full bg-zinc-800 rounded" />
              <div className="h-3 w-[90%] bg-zinc-800 rounded" />
              <div className="h-4 w-1/3 bg-zinc-800 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : error || !insights ? (
        <div className="text-sm text-zinc-400 italic py-4 text-center">
          Failed to generate predictive intelligence brief. Ensure Gemini API key is configured.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insights.map((insight, idx) => {
            const confidenceColor = insight.confidence >= 80 
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
              : "text-amber-400 bg-amber-500/10 border-amber-500/20";

            return (
              <div 
                key={idx} 
                className="relative group p-5 rounded-xl border border-white/5 bg-white/[0.01] hover:border-white/15 transition-all flex flex-col justify-between gap-5 overflow-hidden"
              >
                {/* Background gauge highlight */}
                <div className="absolute top-0 right-0 p-2 opacity-5 text-white pointer-events-none group-hover:opacity-10 transition-opacity">
                  <Target className="w-16 h-16" />
                </div>

                <div className="space-y-3.5 relative z-10">
                  {/* Title & confidence */}
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-extrabold text-white text-sm leading-snug">
                      {insight.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono border shrink-0 ${confidenceColor}`}>
                      {insight.confidence}% Conf
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {insight.description}
                  </p>
                </div>

                {/* Recommendations */}
                <div className="p-3 rounded-lg bg-zinc-950 border border-white/5 space-y-1 relative z-10">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">
                    Recommended Prevention Action:
                  </span>
                  <p className="text-zinc-200 text-xs leading-normal">
                    {insight.recommendedAction}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
