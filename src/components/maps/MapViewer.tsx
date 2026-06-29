/**
 * @file src/components/maps/MapViewer.tsx
 * @description Incident geospatial visualizer using Google Maps. Features Satellite/Roadmap toggles, coordinates actions, and navigation.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { MapPin, Navigation, Globe, Copy, Check, Info, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { MarkerPopup } from "./MarkerPopup";

interface MapViewerProps {
  latitude: number;
  longitude: number;
  title: string;
  category: string;
  severity?: string;
  address?: string;
}

// Inner helper to synchronize map camera panning when coordinates are updated
function MapCameraHandler({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo(center);
    }
  }, [center, map]);
  return null;
}

export function MapViewer({
  latitude,
  longitude,
  title,
  category,
  severity,
  address,
}: MapViewerProps) {
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [copied, setCopied] = useState(false);
  const [infoWindowOpen, setInfoWindowOpen] = useState(true);

  const position: [number, number] = [latitude, longitude];
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${latitude}, ${longitude}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gmapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const hasCoords = latitude && longitude;

  if (!hasCoords) {
    return (
      <div className="h-[320px] bg-slate-950/45 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
        <MapPin className="h-8 w-8 text-slate-600 mb-2 animate-bounce" />
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
          Coordinates Missing
        </span>
        <span className="text-[11px] text-slate-500 max-w-[240px] mt-1">
          This report does not contain valid coordinate values on record.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Control Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setMapType("roadmap")}
            className={`text-xs px-3 py-1.5 border border-slate-800 h-8 ${
              mapType === "roadmap"
                ? "bg-indigo-650 text-white hover:bg-indigo-600 border-none"
                : "bg-slate-900/60 text-slate-350 hover:bg-slate-850"
            }`}
          >
            <Globe className="h-3.5 w-3.5 mr-1" /> Map
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMapType("satellite")}
            className={`text-xs px-3 py-1.5 border border-slate-800 h-8 ${
              mapType === "satellite"
                ? "bg-indigo-650 text-white hover:bg-indigo-600 border-none"
                : "bg-slate-900/60 text-slate-350 hover:bg-slate-850"
            }`}
          >
            <Globe className="h-3.5 w-3.5 mr-1" /> Satellite
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyCoords}
            className="text-[11px] h-8 bg-slate-900/60 border border-slate-800 text-slate-350 hover:bg-slate-850"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1 text-emerald-400" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" /> Copy Lat/Lng
              </>
            )}
          </Button>
          <a href={gmapsDirectionsUrl} target="_blank" rel="noopener noreferrer">
            <Button
              type="button"
              className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs h-8 px-3 rounded-lg flex items-center gap-1 font-semibold border-none"
            >
              <Navigation className="h-3 w-3" /> Navigate
            </Button>
          </a>
        </div>
      </div>

      {/* Map Content Box */}
      <div 
        className="h-[320px] w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/40 relative shadow-lg"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {!apiKey ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/60 backdrop-blur-sm gap-2">
            <AlertCircle className="h-8 w-8 text-amber-500 animate-bounce" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Map Service Unavailable</span>
            <span className="text-[11px] text-slate-500 max-w-[260px] leading-relaxed">
              Google Maps API Key is missing. Coordinates are available on record.
            </span>
          </div>
        ) : (
          <Map
            defaultZoom={16}
            defaultCenter={{ lat: position[0], lng: position[1] }}
            center={{ lat: position[0], lng: position[1] }}
            mapId="DEMO_MAP_ID"
            mapTypeId={mapType}
            gestureHandling="greedy"
            disableDefaultUI={true}
            style={{ width: "100%", height: "100%" }}
          >
            <AdvancedMarker
              position={{ lat: position[0], lng: position[1] }}
              onClick={() => setInfoWindowOpen(true)}
            />
            {infoWindowOpen && (
              <InfoWindow
                position={{ lat: position[0], lng: position[1] }}
                onCloseClick={() => setInfoWindowOpen(false)}
              >
                <MarkerPopup
                  title={title}
                  category={category}
                  severity={severity}
                  address={address}
                  latitude={latitude}
                  longitude={longitude}
                />
              </InfoWindow>
            )}
            <MapCameraHandler center={{ lat: position[0], lng: position[1] }} />
          </Map>
        )}
      </div>

      {/* Address Details display panel */}
      {address && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-slate-900/30 border border-slate-850 rounded-2xl">
          <Info className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
              Report Address
            </span>
            <span className="text-xs text-slate-300 font-medium select-all leading-normal">
              {address}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapViewer;
