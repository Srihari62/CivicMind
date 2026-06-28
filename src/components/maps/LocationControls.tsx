/**
 * @file src/components/maps/LocationControls.tsx
 * @description Manual location controls panel. Handles address entry, coordinate tweaks, and GPS lookup trigger.
 */

"use client";

import React from "react";
import { Navigation, Loader2, Compass } from "lucide-react";
import { ReportLocation } from "@/types";
import { Button } from "@/components/ui/button";

interface LocationControlsProps {
  location: ReportLocation;
  loading: boolean;
  onUseCurrentLocation: () => void;
  onAddressChange: (address: string) => void;
  onCoordsChange: (lat: number, lng: number) => void;
}

export function LocationControls({
  location,
  loading,
  onUseCurrentLocation,
  onAddressChange,
  onCoordsChange,
}: LocationControlsProps) {
  return (
    <div className="border border-slate-850 p-4 rounded-2xl bg-slate-900/15 flex flex-col gap-3 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-850">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-indigo-400" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Coordinates Metadata
          </span>
        </div>
        <Button
          type="button"
          onClick={onUseCurrentLocation}
          disabled={loading}
          variant="outline"
          className="bg-indigo-650 hover:bg-indigo-600 text-white text-[11px] h-8 px-3 rounded-lg flex items-center gap-1.5 font-semibold transition-all border-none"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5" />
          )}
          GPS Location
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
            Selected Address (Editable)
          </label>
          <input
            type="text"
            value={location.formattedAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="No address resolved. Enter manually..."
            className="w-full px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={location.latitude}
              onChange={(e) => {
                const lat = parseFloat(e.target.value) || 0;
                onCoordsChange(lat, location.longitude);
              }}
              className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 transition-colors"
            />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={location.longitude}
              onChange={(e) => {
                const lng = parseFloat(e.target.value) || 0;
                onCoordsChange(location.latitude, lng);
              }}
              className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
