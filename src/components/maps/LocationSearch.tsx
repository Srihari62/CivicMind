/**
 * @file src/components/maps/LocationSearch.tsx
 * @description Nominatim address autocompleting search box component.
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, MapPin, X } from "lucide-react";
import { GeocoderService } from "@/services/location/geocoder.service";
import { ReportLocation } from "@/types";

interface LocationSearchProps {
  onSelectLocation: (location: ReportLocation) => void;
  className?: string;
}

export function LocationSearch({ onSelectLocation, className = "" }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReportLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search logic
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await GeocoderService.geocode(query);
        setResults(data);
        setShowDropdown(true);
      } catch (err) {
        console.error("Geocode lookup failed:", err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Handle click outside of dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (loc: ReportLocation) => {
    setQuery(loc.formattedAddress);
    setShowDropdown(false);
    onSelectLocation(loc);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center w-full">
        <span className="absolute left-3.5 text-slate-400">
          <Search className="h-4 w-4" />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any landmark, address or city..."
          className="w-full pl-10 pr-10 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all backdrop-blur-md"
        />
        {loading && (
          <span className="absolute right-3.5 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-[1000] w-full mt-1.5 bg-slate-950/95 border border-slate-800 rounded-xl max-h-60 overflow-y-auto shadow-2xl backdrop-blur-lg animate-in fade-in slide-in-from-top-1 duration-200">
          {results.map((loc, idx) => (
            <button
              key={loc.placeId || idx}
              type="button"
              onClick={() => handleSelect(loc)}
              className="w-full text-left px-4 py-3 hover:bg-slate-900/80 border-b border-slate-900/50 last:border-b-0 flex items-start gap-3 transition-colors group"
            >
              <MapPin className="h-4 w-4 text-slate-500 mt-0.5 shrink-0 group-hover:text-indigo-400 transition-colors" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-slate-250 leading-normal line-clamp-2">
                  {loc.formattedAddress}
                </span>
                {loc.city && (
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">
                    {loc.city}, {loc.state}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
