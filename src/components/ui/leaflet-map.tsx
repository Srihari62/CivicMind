"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, ExternalLink, Copy, Check } from "lucide-react";

interface LeafletMapProps {
  latitude?: number | null;
  longitude?: number | null;
  title: string;
  category: string;
}

export default function LeafletMap({ latitude, longitude, title, category }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    if (!latitude || !longitude) return;

    // Fix default marker icon assets for Webpack/NextJS
    // @ts-expect-error - overriding default icon url behavior for Next.js build compatibility
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([latitude, longitude], 15);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const popupContent = `
        <div style="font-family: sans-serif; padding: 4px; color: #0f172a;">
          <h4 style="margin: 0 0 4px 0; font-weight: 700; font-size: 13px;">${title}</h4>
          <span style="font-size: 11px; color: #64748b; text-transform: capitalize;">${category.replace("_", " ")}</span>
          <div style="font-size: 10px; font-family: monospace; color: #4f46e5; margin-top: 6px;">
            ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
          </div>
        </div>
      `;

      L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup(popupContent)
        .openPopup();
    } else {
      mapRef.current.setView([latitude, longitude], 15);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, title, category]);

  if (!latitude || !longitude) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] border border-slate-800 rounded-2xl bg-slate-950/40 p-6 text-center backdrop-blur-sm">
        <MapPin className="h-10 w-10 text-slate-500 mb-3 animate-pulse" />
        <h4 className="text-sm font-semibold text-slate-300">Geospatial Data Missing</h4>
        <p className="text-xs text-slate-500 max-w-[240px] mt-1">
          No geographic coordinates were registered with this incident report evidence.
        </p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`${latitude}, ${longitude}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <div className="border border-slate-800 rounded-2xl bg-slate-950/40 overflow-hidden backdrop-blur-sm flex flex-col h-[320px]">
      <div className="flex-1 min-h-[220px] relative z-0" ref={mapContainerRef} />
      <div className="bg-slate-950/80 border-t border-slate-850 p-3 flex items-center justify-between gap-3 text-xs">
        <span className="font-mono text-slate-400 select-all">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-850 text-slate-300 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Maps
          </a>
        </div>
      </div>
    </div>
  );
}
