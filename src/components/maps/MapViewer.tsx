/**
 * @file src/components/maps/MapViewer.tsx
 * @description Incident geospatial visualizer using Leaflet. Features Satellite/OSM view, coordinates actions, and Google Maps redirections.
 */

"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { MapPin, Navigation, Globe, Copy, Check, Info } from "lucide-react";
import { Button } from "../ui/button";
import { MarkerPopup } from "./MarkerPopup";

// Fix Leaflet marker asset paths
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewerProps {
  latitude: number;
  longitude: number;
  title: string;
  category: string;
  severity?: string;
  address?: string;
}

// Inner helper to synchronize map camera panning when coordinates are updated
function MapCameraHandler({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
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
  const [mapType, setMapType] = useState<"osm" | "satellite">("osm");
  const [copied, setCopied] = useState(false);

  const position: [number, number] = [latitude, longitude];

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

  // Choose the TileLayer URL based on user toggle selection
  const tileLayerUrl =
    mapType === "satellite"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const attribution =
    mapType === "satellite"
      ? "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Control Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setMapType("osm")}
            className={`text-xs px-3 py-1.5 border border-slate-800 h-8 ${
              mapType === "osm"
                ? "bg-indigo-600 text-white hover:bg-indigo-500"
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
                ? "bg-indigo-600 text-white hover:bg-indigo-500"
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
      <div className="h-[320px] w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/40 relative z-10 shadow-lg">
        <MapContainer
          center={position}
          zoom={16}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer attribution={attribution} url={tileLayerUrl} />
          <Marker position={position}>
            <Popup className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden">
              <MarkerPopup
                title={title}
                category={category}
                severity={severity}
                address={address}
                latitude={latitude}
                longitude={longitude}
              />
            </Popup>
          </Marker>
          <MapCameraHandler center={position} />
        </MapContainer>
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
