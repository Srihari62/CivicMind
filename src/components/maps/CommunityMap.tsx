/**
 * @file src/components/maps/CommunityMap.tsx
 * @description Map component for the community feed showing reports as markers and the radius search circle.
 */

"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CivicReport } from "@/types";
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

interface CommunityMapProps {
  center: [number, number];
  reports: CivicReport[];
  radiusKm: number;
}

function MapController({ center, radiusKm }: { center: [number, number]; radiusKm: number }) {
  const map = useMap();
  useEffect(() => {
    // Dynamically adjust zoom based on radius
    let zoom = 14;
    if (radiusKm <= 1) zoom = 15;
    else if (radiusKm <= 3) zoom = 14;
    else if (radiusKm <= 5) zoom = 13;
    else if (radiusKm <= 10) zoom = 12;
    else zoom = 11;
    
    map.setView(center, zoom);
  }, [center, radiusKm, map]);
  return null;
}

export default function CommunityMap({ center, reports, radiusKm }: CommunityMapProps) {
  const tileLayerUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="h-full w-full relative z-10">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer attribution={attribution} url={tileLayerUrl} />
        
        {/* User Location Marker */}
        <Marker 
          position={center} 
          icon={L.divIcon({
            className: "custom-user-pin",
            html: `<div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white animate-pulse shadow-md"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })}
        >
          <Popup>
            <div className="text-xs font-bold text-slate-800">Your Current Center</div>
          </Popup>
        </Marker>

        {/* Radius Circle */}
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.08,
            weight: 1.5,
            dashArray: "4 4"
          }}
        />

        {/* Incident Markers */}
        {reports.map((report) => {
          if (!report.location?.latitude || !report.location?.longitude) return null;
          return (
            <Marker 
              key={report.id} 
              position={[report.location.latitude, report.location.longitude]}
            >
              <Popup className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden">
                <MarkerPopup
                  title={report.ai?.assistant?.title || report.metadata.title}
                  category={report.ai?.assistant?.category || report.metadata.category}
                  severity={report.ai?.assistant?.severity || "medium"}
                  address={report.location.formattedAddress}
                  latitude={report.location.latitude}
                  longitude={report.location.longitude}
                />
              </Popup>
            </Marker>
          );
        })}

        <MapController center={center} radiusKm={radiusKm} />
      </MapContainer>
    </div>
  );
}
