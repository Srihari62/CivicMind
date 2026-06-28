/**
 * @file src/components/maps/MarkerPopup.tsx
 * @description Presentational popup component used inside Leaflet maps.
 */

import React from "react";

interface MarkerPopupProps {
  title: string;
  category: string;
  severity?: string;
  address?: string;
  latitude: number;
  longitude: number;
}

export function MarkerPopup({
  title,
  category,
  severity,
  address,
  latitude,
  longitude,
}: MarkerPopupProps) {
  // Severity label styling helper
  const getSeverityStyle = (sev?: string) => {
    switch (sev?.toLowerCase()) {
      case "critical":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "high":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    }
  };

  return (
    <div className="text-slate-200 p-2 max-w-[240px] flex flex-col gap-2 font-sans">
      <div className="flex flex-col gap-0.5">
        <h4 className="font-bold text-xs text-white leading-snug line-clamp-1">{title}</h4>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span className="text-[8px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
            {category}
          </span>
          {severity && (
            <span className={`text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getSeverityStyle(severity)}`}>
              {severity}
            </span>
          )}
        </div>
      </div>

      {address && (
        <p className="text-[10px] text-slate-400 leading-normal border-t border-slate-800 pt-1.5 line-clamp-2">
          {address}
        </p>
      )}

      <div className="text-[8px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-850 pt-1">
        <span>LAT: {latitude.toFixed(5)}</span>
        <span>LNG: {longitude.toFixed(5)}</span>
      </div>
    </div>
  );
}
