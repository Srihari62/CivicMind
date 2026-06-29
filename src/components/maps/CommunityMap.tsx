/**
 * @file src/components/maps/CommunityMap.tsx
 * @description Map component for the community feed showing reports as markers and the radius search circle.
 */

"use client";

import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { CivicReport } from "@/types";
import { MarkerPopup } from "./MarkerPopup";
import { AlertCircle } from "lucide-react";

interface CommunityMapProps {
  center: [number, number];
  reports: CivicReport[];
  radiusKm: number;
}

// Custom Circle component for @vis.gl/react-google-maps
interface CircleProps extends google.maps.CircleOptions {
  center: google.maps.LatLngLiteral;
  radius: number;
}

const Circle = forwardRef((props: CircleProps, ref) => {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;

    const circle = new google.maps.Circle({
      map,
      ...props,
    });
    circleRef.current = circle;

    return () => {
      circle.setMap(null);
    };
  }, [map]);

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setOptions(props);
    }
  }, [props]);

  useImperativeHandle(ref, () => circleRef.current);

  return null;
});
Circle.displayName = "Circle";

// Helper component to control zoom and center dynamically when search parameters change
function MapController({ center, radiusKm }: { center: { lat: number; lng: number }; radiusKm: number }) {
  const map = useMap();
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!map) return;

    const isSame =
      lastCenterRef.current &&
      lastCenterRef.current.lat === center.lat &&
      lastCenterRef.current.lng === center.lng;

    if (isSame) return;
    lastCenterRef.current = center;

    let zoom = 14;
    if (radiusKm <= 1) zoom = 15;
    else if (radiusKm <= 3) zoom = 14;
    else if (radiusKm <= 5) zoom = 13;
    else if (radiusKm <= 10) zoom = 12;
    else zoom = 11;

    map.setZoom(zoom);
    map.panTo(center);
  }, [center.lat, center.lng, radiusKm, map]);
  return null;
}

export default function CommunityMap({ center, reports, radiusKm }: CommunityMapProps) {
  const [selectedReport, setSelectedReport] = useState<CivicReport | null>(null);
  
  const centerObj = { lat: center[0], lng: center[1] };
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="h-full w-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center bg-slate-950/60 border border-slate-800 rounded-2xl gap-2">
        <AlertCircle className="h-8 w-8 text-amber-500 animate-bounce" />
        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Map Service Unavailable</span>
        <span className="text-[11px] text-slate-500 max-w-[260px] leading-relaxed">
          Google Maps API Key is missing. Feed list details are displayed on the left.
        </span>
      </div>
    );
  }

  return (
    <div 
      className="h-full w-full relative z-0"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <Map
        defaultZoom={14}
        defaultCenter={centerObj}
        mapId="DEMO_MAP_ID"
        gestureHandling="greedy"
        disableDefaultUI={true}
        style={{ width: "100%", height: "100%" }}
      >
        {/* User Location Pulsar Marker */}
        <AdvancedMarker position={centerObj}>
          <div className="relative flex items-center justify-center">
            <div className="absolute w-6 h-6 rounded-full bg-blue-500/35 animate-ping" />
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md" />
          </div>
        </AdvancedMarker>

        {/* Search Radius Circle */}
        <Circle
          center={centerObj}
          radius={radiusKm * 1000}
          strokeColor="#3b82f6"
          strokeOpacity={0.7}
          strokeWeight={1.5}
          fillColor="#3b82f6"
          fillOpacity={0.08}
        />

        {/* Incident Reports Markers */}
        {reports.map((report) => {
          if (!report.location?.latitude || !report.location?.longitude) return null;
          const pos = { lat: report.location.latitude, lng: report.location.longitude };
          
          return (
            <AdvancedMarker
              key={report.id}
              position={pos}
              onClick={() => setSelectedReport(report)}
            />
          );
        })}

        {/* Info Window for Selected Marker */}
        {selectedReport && selectedReport.location?.latitude && (
          <InfoWindow
            position={{
              lat: selectedReport.location.latitude,
              lng: selectedReport.location.longitude,
            }}
            onCloseClick={() => setSelectedReport(null)}
          >
            <MarkerPopup
              title={selectedReport.ai?.assistant?.title || selectedReport.metadata.title}
              category={selectedReport.ai?.assistant?.category || selectedReport.metadata.category}
              severity={(selectedReport.ai?.assistant?.severity || selectedReport.ai?.verification?.priority) ?? undefined}
              address={selectedReport.location.formattedAddress}
              latitude={selectedReport.location.latitude}
              longitude={selectedReport.location.longitude}
            />
          </InfoWindow>
        )}

        <MapController center={centerObj} radiusKm={radiusKm} />
      </Map>
    </div>
  );
}
