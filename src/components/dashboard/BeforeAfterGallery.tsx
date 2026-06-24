/**
 * @file src/components/dashboard/BeforeAfterGallery.tsx
 * @description Comparison section for resolved incidents displaying before/after media, zoom controls, and a detailed lightbox.
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, X, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { CivicReport, MediaAsset } from "@/types";

interface BeforeAfterGalleryProps {
  report: CivicReport;
}

export default function BeforeAfterGallery({ report }: BeforeAfterGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxType, setLightboxType] = useState<"before" | "after" | null>(null);

  // Extract Resolution Details safely
  const reportExtended = report as unknown as Record<string, unknown>;
  const resolution = report.resolution || (reportExtended.resolutionPayload as Record<string, unknown> | undefined);
  const officerNotes = report.resolutionNotes || (resolution ? String(resolution.notes || "") : "") || "No notes provided.";
  
  // Extract Before / After Assets safely
  const repairEvidence = resolution?.repairEvidence as Record<string, unknown> | undefined;
  const beforeAssets: MediaAsset[] = report.repairEvidence?.before || (repairEvidence?.before as MediaAsset[] | undefined) || report.evidence?.media || [];
  const afterAssets: MediaAsset[] = report.repairEvidence?.after || (repairEvidence?.after as MediaAsset[] | undefined) || report.resolutionMedia || (resolution?.proofPhotoUrl ? [{ id: "after_proof", url: String(resolution.proofPhotoUrl), type: "image" } as MediaAsset] : []);

  const aiSummary = (resolution?.aiSummary || reportExtended.aiSummaryPayload) as { workCompleted?: string; summary?: string; citizenExplanation?: string } | null | undefined;

  const openLightbox = (type: "before" | "after", index: number) => {
    setLightboxType(type);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxType(null);
    setLightboxIndex(null);
  };

  const getActiveAssets = () => {
    if (lightboxType === "before") return beforeAssets;
    if (lightboxType === "after") return afterAssets;
    return [];
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    const assets = getActiveAssets();
    if (!assets.length || lightboxIndex === null) return;

    if (direction === "prev") {
      setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : assets.length - 1));
    } else {
      setLightboxIndex((prev) => (prev !== null && prev < assets.length - 1 ? prev + 1 : 0));
    }
  };

  const activeAssets = getActiveAssets();
  const currentAsset = lightboxIndex !== null ? activeAssets[lightboxIndex] : null;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md shadow-2xl space-y-6">
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-4">
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Resolution & Proof Gallery</h3>
          <span className="text-xs text-zinc-400">Verifying structural cleanup & repairs</span>
        </div>
      </div>

      {/* Before / After Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Before Column */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wider select-none flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Before Repair
          </h4>
          {beforeAssets.length === 0 ? (
            <div className="aspect-[4/3] rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 flex items-center justify-center text-xs text-zinc-500">
              No before images uploaded.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {beforeAssets.map((asset, idx) => (
                <div 
                  key={asset.id || idx}
                  className="aspect-[4/3] rounded-xl overflow-hidden border border-white/5 bg-zinc-900 relative group cursor-pointer"
                  onClick={() => openLightbox("before", idx)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={asset.url} 
                    alt="Incident Before" 
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* After Column */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider select-none flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            After Resolution
          </h4>
          {afterAssets.length === 0 ? (
            <div className="aspect-[4/3] rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 flex items-center justify-center text-xs text-zinc-500">
              No verification images uploaded.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {afterAssets.map((asset, idx) => (
                <div 
                  key={asset.id || idx}
                  className="aspect-[4/3] rounded-xl overflow-hidden border border-white/5 bg-zinc-900 relative group cursor-pointer"
                  onClick={() => openLightbox("after", idx)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={asset.url} 
                    alt="Incident After" 
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Officer Notes & AI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-6 text-sm">
        {/* Officer Notes */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Field Officer Notes</span>
          <p className="p-4 rounded-xl bg-white/5 border border-white/5 text-zinc-200 min-h-[100px] leading-relaxed whitespace-pre-wrap">
            {officerNotes}
          </p>
        </div>

        {/* AI Resolution Summary */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">AI Resolution Audit</span>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-zinc-200 min-h-[100px] space-y-2 leading-relaxed">
            {aiSummary ? (
              <>
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase block tracking-wider">Work Completed</span>
                  <span className="text-xs text-zinc-300">{aiSummary.workCompleted || aiSummary.summary}</span>
                </div>
                {aiSummary.citizenExplanation && (
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block tracking-wider">Citizen Explanation</span>
                    <span className="text-xs text-zinc-300">{aiSummary.citizenExplanation}</span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-xs text-zinc-400 italic">No AI Resolution summary calculated.</span>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox / Overlay Zoom */}
      <AnimatePresence>
        {lightboxType && currentAsset && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
          >
            <button 
              onClick={closeLightbox}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              aria-label="Close Lightbox"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Nav Arrows */}
            {activeAssets.length > 1 && (
              <>
                <button
                  onClick={() => navigateLightbox("prev")}
                  className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                  aria-label="Previous Image"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={() => navigateLightbox("next")}
                  className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                  aria-label="Next Image"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            {/* Zoomed Image */}
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="max-w-4xl max-h-[80vh] flex flex-col items-center justify-center gap-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={currentAsset.url} 
                alt="Zoomed evidence" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-white/10 shadow-2xl"
              />
              <span className="text-xs font-semibold px-3 py-1 rounded bg-zinc-900 border border-zinc-800 uppercase tracking-widest text-zinc-300">
                {lightboxType} Photo • {lightboxIndex !== null ? lightboxIndex + 1 : 1} of {activeAssets.length}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
