/**
 * @file src/components/admin/IncidentHeatmap.tsx
 * @description Google Maps Incident Heatmap and Map Analytics component for SPRINT 10.
 * Supports switching between Markers, custom grids Clustering, and Heatmap overlay blending.
 */

"use client";

import React, { useState, useEffect } from"react";
import { MapPin, Globe, Layers, ZoomIn, Calendar, Eye, AlertCircle } from"lucide-react";
import { CivicReport } from"@/types";
import Link from"next/link";
import { Button } from"../ui/button";
import { Map, AdvancedMarker, InfoWindow, useMap, useMapsLibrary } from"@vis.gl/react-google-maps";

export default function IncidentHeatmap({ reports }: { reports: CivicReport[] }) {
 const [mounted, setMounted] = useState(false);
 const [timeFilter, setTimeFilter] = useState<"today" |"week" |"month" |"all">("all");
 const [statusFilter, setStatusFilter] = useState<"unresolved" |"resolved" |"all">("unresolved");
 const [categoryFilters, setCategoryFilters] = useState<Record<string, boolean>>({
 road_damage: true,
 garbage: true,
 water_leakage: true,
 street_light: true,
 drainage: true,
 illegal_dumping: true,
 traffic_signal: true,
 public_safety: true,
 other: true,
 });
 const [mapView, setMapView] = useState<"markers" |"cluster" |"heatmap">("markers");

 useEffect(() => {
 setMounted(true);
 }, []);

 if (!mounted) {
 return (
 <div className="h-[500px] rounded-2xl border border-slate-200 clay-card flex items-center justify-center animate-pulse">
 <span className="text-slate-500 font-semibold text-sm">Initializing Command Map Engine...</span>
 </div>
);
 }

 // Filter reports locally
 const filteredReports = reports.filter((r) => {
 // 0. Status layer check
 if (statusFilter ==="unresolved") {
 const activeStatuses = [
"submitted",
"processing",
"verified",
"waiting_assignment",
"assigned",
"accepted",
"travelling",
"investigating",
"repair_in_progress",
"awaiting_verification"
 ];
 if (!activeStatuses.includes(r.status)) return false;
 } else if (statusFilter ==="resolved") {
 const resolvedStatuses = ["resolved","closed"];
 if (!resolvedStatuses.includes(r.status)) return false;
 }

 // 1. Coordinates check
 if (!r.location?.latitude || !r.location?.longitude) return false;

 // 2. Category check
 const cat = r.metadata?.category ||"other";
 if (!categoryFilters[cat]) return false;

 // 3. Time Filter check
 if (timeFilter ==="all") return true;
 const reportDate = new Date(r.timestamps?.createdAt || 0).getTime();
 const now = Date.now();
 const oneDay = 24 * 60 * 60 * 1000;

 if (timeFilter ==="today") {
 return now - reportDate < oneDay;
 }
 if (timeFilter ==="week") {
 return now - reportDate < oneDay * 7;
 }
 if (timeFilter ==="month") {
 return now - reportDate < oneDay * 30;
 }
 return true;
 });

 return (
 <div className="w-full clay-card p-6 space-y-6 relative z-10">
 {/* Control Title Bar */}
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
 <Globe className="w-5 h-5 text-red-400" />
 </div>
 <div>
 <h3 className="text-lg font-bold text-slate-800">Geospatial Incident Intelligence</h3>
 <span className="text-xs text-slate-500">Real-time command center telemetry plotting</span>
 </div>
 </div>

 {/* Filters and map toggle */}
 <div className="flex flex-wrap items-center gap-3">
 {/* View Toggles */}
 <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5">
 <button
 onClick={() => setMapView("markers")}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
 mapView ==="markers" ?"bg-red-505 bg-red-600 text-slate-800 shadow-md rounded-lg" :"text-slate-500 hover:text-slate-800"
 }`}
 >
 <MapPin className="w-3.5 h-3.5" /> Markers
 </button>
 <button
 onClick={() => setMapView("cluster")}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
 mapView ==="cluster" ?"bg-red-505 bg-red-600 text-slate-800 shadow-md rounded-lg" :"text-slate-500 hover:text-slate-800"
 }`}
 >
 <ZoomIn className="w-3.5 h-3.5" /> Clusters
 </button>
 <button
 onClick={() => setMapView("heatmap")}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
 mapView ==="heatmap" ?"bg-red-505 bg-red-600 text-slate-800 shadow-md rounded-lg" :"text-slate-500 hover:text-slate-800"
 }`}
 >
 <Layers className="w-3.5 h-3.5" /> Heatmap
 </button>
 </div>

 {/* Status Layer Filter */}
 <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-600">
 <Layers className="w-3.5 h-3.5 text-slate-500" />
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value as"unresolved" |"resolved" |"all")}
 className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
 >
 <option value="unresolved">Active Incidents</option>
 <option value="resolved">Resolved Incidents</option>
 <option value="all">All Incidents</option>
 </select>
 </div>

 {/* Time Filter Dropdown */}
 <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-600">
 <Calendar className="w-3.5 h-3.5 text-slate-500" />
 <select
 value={timeFilter}
 onChange={(e) => setTimeFilter(e.target.value as"today" |"week" |"month" |"all")}
 className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
 >
 <option value="all">All Time</option>
 <option value="today">Today</option>
 <option value="week">This Week</option>
 <option value="month">This Month</option>
 </select>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
 {/* Left Side: Category Filters Checklist */}
 <div className="lg:col-span-1 space-y-4">
 <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Category Layers</h4>
 <div className="space-y-2 border border-slate-200 p-4 rounded-xl bg-white/[0.02]">
 {Object.keys(categoryFilters).map((catKey) => (
 <label key={catKey} className="flex items-center gap-2.5 py-1 text-xs text-slate-600 cursor-pointer hover:text-slate-800 transition">
 <input
 type="checkbox"
 checked={categoryFilters[catKey]}
 onChange={(e) => setCategoryFilters({ ...categoryFilters, [catKey]: e.target.checked })}
 className="rounded border-slate-200 bg-slate-100 text-red-500 focus:ring-red-500/40 w-4 h-4"
 />
 <span className="capitalize font-medium">{catKey.replace("_","")}</span>
 </label>
))}
 </div>

 {/* Severity legend */}
 <div className="space-y-2 border border-slate-200 p-4 rounded-xl bg-white/[0.02]">
 <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Severity Legend</h5>
 <div className="space-y-1.5 text-xs text-slate-500">
 <div className="flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
 <span>Critical</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-orange-500 block" />
 <span>High</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block" />
 <span>Medium</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
 <span>Low</span>
 </div>
 </div>
 </div>
 </div>

 {/* Right Side: Google Map Container */}
 <div className="lg:col-span-3 h-[420px] rounded-xl overflow-hidden border border-slate-200 bg-slate-50 relative">
 <InnerMapWrapper reports={filteredReports} viewType={mapView} />
 </div>
 </div>
 </div>
);
}

// Google Maps Heatmap Layer Overlay Component
interface HeatmapLayerProps {
 data: google.maps.LatLngLiteral[];
}

function HeatmapLayer({ data }: HeatmapLayerProps) {
 const map = useMap();
 const vizLibrary = useMapsLibrary("visualization");

 useEffect(() => {
 if (!map || !vizLibrary) return;
 if (typeof google ==="undefined" || !google.maps || !google.maps.LatLng) return;

 try {
 const googlePoints = data
 .map((pt) => {
 const lat = Number(pt.lat);
 const lng = Number(pt.lng);
 if (isNaN(lat) || isNaN(lng)) return null;
 return new google.maps.LatLng(lat, lng);
 })
 .filter((pt): pt is google.maps.LatLng => pt !== null);

 const heatmap = new vizLibrary.HeatmapLayer();
 (heatmap as any).setOptions({
 data: googlePoints,
 map: map,
 radius: 35,
 opacity: 0.85,
 });

 return () => {
 (heatmap as any).setMap(null);
 };
 } catch (e) {
 console.error("Error rendering HeatmapLayer:", e);
 }
 }, [map, vizLibrary, data]);

 return null;
}

// MapViewportController helper for Google Maps camera bounds panning
function MapViewportController({ reports }: { reports: CivicReport[] }) {
 const map = useMap();
 useEffect(() => {
 if (!map || reports.length === 0) return;
 if (typeof google ==="undefined" || !google.maps || !google.maps.LatLngBounds) return;

 try {
 const gBounds = new google.maps.LatLngBounds();
 let validCount = 0;
 reports.forEach((r) => {
 if (r.location?.latitude && r.location?.longitude) {
 const lat = Number(r.location.latitude);
 const lng = Number(r.location.longitude);
 if (!isNaN(lat) && !isNaN(lng)) {
 gBounds.extend({ lat, lng });
 validCount++;
 }
 }
 });

 if (validCount === 0) return;

 if (validCount === 1) {
 const singleReport = reports.find(r => r.location?.latitude && r.location?.longitude);
 if (singleReport) {
 const lat = Number(singleReport.location.latitude);
 const lng = Number(singleReport.location.longitude);
 if (!isNaN(lat) && !isNaN(lng)) {
 map.setCenter({ lat, lng });
 map.setZoom(14);
 }
 }
 } else {
 map.fitBounds(gBounds);
 }
 } catch (e) {
 console.error("Error centering map:", e);
 }
 }, [reports, map]);

 return null;
}

function ClusterMarkersView({ 
 clusters, 
 setSelectedReport, 
 getSeverityColor 
}: { 
 clusters: Record<string, { center: [number, number]; points: CivicReport[]; bounds: [number, number][] }>;
 setSelectedReport: (r: CivicReport | null) => void;
 getSeverityColor: (severity?: string | null) => string;
}) {
 const map = useMap();

 return (
 <>
 {Object.keys(clusters).map((key) => {
 const cluster = clusters[key];
 const count = cluster.points.length;

 if (count === 1) {
 const r = cluster.points[0];
 const severityColor = getSeverityColor(r.ai?.assistant?.severity || r.ai?.verification?.priority);
 return (
 <AdvancedMarker
 key={r.id}
 position={{ lat: r.location.latitude, lng: r.location.longitude }}
 onClick={() => setSelectedReport(r)}
 >
 <div 
 className="w-3.5 h-3.5 rounded-full border border-white shadow-md cursor-pointer hover:scale-110 transition"
 style={{ backgroundColor: severityColor }}
 />
 </AdvancedMarker>
);
 }

 // Cluster marker
 return (
 <AdvancedMarker
 key={key}
 position={{ lat: cluster.center[0], lng: cluster.center[1] }}
 onClick={() => {
 if (typeof google ==="undefined" || !google.maps || !google.maps.LatLngBounds) return;
 try {
 if (map && cluster.bounds.length > 0) {
 const gBounds = new google.maps.LatLngBounds();
 cluster.bounds.forEach(([lat, lng]) => {
 const latNum = Number(lat);
 const lngNum = Number(lng);
 if (!isNaN(latNum) && !isNaN(lngNum)) {
 gBounds.extend({ lat: latNum, lng: lngNum });
 }
 });
 map.fitBounds(gBounds);
 }
 } catch (e) {
 console.error("Error fitting cluster bounds:", e);
 }
 }}
 >
 <div 
 className="flex items-center justify-center rounded-full border border-white font-extrabold text-slate-800 text-xs cursor-pointer shadow-lg hover:scale-105 transition"
 style={{
 width: `${24 + Math.min(count * 2, 14)}px`,
 height: `${24 + Math.min(count * 2, 14)}px`,
 backgroundColor:"#ef4444",
 }}
 >
 {count}
 </div>
 </AdvancedMarker>
);
 })}
 </>
);
}

function InnerMapWrapper({ reports, viewType }: { reports: CivicReport[]; viewType:"markers" |"cluster" |"heatmap" }) {
 const [selectedReport, setSelectedReport] = useState<CivicReport | null>(null);

 const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

 const defaultCenter = reports.length > 0 
 ? { lat: reports[0].location.latitude, lng: reports[0].location.longitude }
 : { lat: 12.9716, lng: 77.5946 };

 const getSeverityColor = (severity?: string | null) => {
 const val = String(severity ||"").toLowerCase();
 if (val ==="critical") return"#ef4444"; // Red
 if (val ==="high") return"#f97316"; // Orange
 if (val ==="medium") return"#3b82f6"; // Blue
 return"#10b981"; // Green
 };

 // Custom Grid Clustering Algorithm
 const gridSize = 0.006;
 const clusters: Record<string, { center: [number, number]; points: CivicReport[]; bounds: [number, number][] }> = {};

 reports.forEach((r) => {
 const lat = r.location.latitude;
 const lng = r.location.longitude;
 const latBin = Math.floor(lat / gridSize);
 const lngBin = Math.floor(lng / gridSize);
 const key = `${latBin}_${lngBin}`;

 if (!clusters[key]) {
 clusters[key] = {
 center: [lat, lng],
 points: [],
 bounds: [],
 };
 }
 clusters[key].points.push(r);
 clusters[key].bounds.push([lat, lng]);
 });

 // Calculate cluster average centers
 Object.keys(clusters).forEach((key) => {
 const cluster = clusters[key];
 const totalPoints = cluster.points.length;
 const avgLat = cluster.points.reduce((sum, r) => sum + r.location.latitude, 0) / totalPoints;
 const avgLng = cluster.points.reduce((sum, r) => sum + r.location.longitude, 0) / totalPoints;
 cluster.center = [avgLat, avgLng];
 });

 if (!apiKey) {
 return (
 <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-50/60 backdrop-blur-sm gap-2">
 <AlertCircle className="h-8 w-8 text-amber-500 animate-bounce" />
 <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Map Service Unavailable</span>
 <span className="text-[11px] text-slate-500 max-w-[260px] leading-relaxed">
 Google Maps API Key is missing. Live analytics coordinates cannot be mapped visually.
 </span>
 </div>
);
 }

 return (
 <div className="w-full h-full relative z-0">
 <Map
 defaultZoom={12}
 defaultCenter={defaultCenter}
 mapId="DEMO_MAP_ID"
 gestureHandling="greedy"
 disableDefaultUI={true}
 style={{ width:"100%", height:"100%", background:"#09090b" }}
 >
 <MapViewportController reports={reports} />

 {/* 1. Markers View */}
 {viewType ==="markers" &&
 reports.map((r) => {
 const severityColor = getSeverityColor(r.ai?.assistant?.severity || r.ai?.verification?.priority);
 return (
 <AdvancedMarker
 key={r.id}
 position={{ lat: r.location.latitude, lng: r.location.longitude }}
 onClick={() => setSelectedReport(r)}
 >
 <div 
 className="w-3.5 h-3.5 rounded-full border border-white shadow-md cursor-pointer hover:scale-110 transition"
 style={{ backgroundColor: severityColor }}
 />
 </AdvancedMarker>
);
 })}

 {/* 2. Cluster View */}
 {viewType ==="cluster" && (
 <ClusterMarkersView 
 clusters={clusters} 
 setSelectedReport={setSelectedReport} 
 getSeverityColor={getSeverityColor} 
 />
)}

 {/* 3. Heatmap View */}
 {viewType ==="heatmap" && (
 <HeatmapLayer
 data={reports.map((r) => ({
 lat: r.location.latitude,
 lng: r.location.longitude,
 }))}
 />
)}

 {/* Popup for Selected Marker */}
 {selectedReport && selectedReport.location?.latitude && (
 <InfoWindow
 position={{
 lat: selectedReport.location.latitude,
 lng: selectedReport.location.longitude,
 }}
 onCloseClick={() => setSelectedReport(null)}
 >
 <PopupReportDetail
 report={selectedReport}
 color={getSeverityColor(selectedReport.ai?.assistant?.severity || selectedReport.ai?.verification?.priority)}
 />
 </InfoWindow>
)}
 </Map>
 </div>
);
}

/* Popup renderer */
function PopupReportDetail({ report, color }: { report: CivicReport; color: string }) {
 const category = report.metadata?.category ||"other";
 const priority = report.ai?.verification?.priority || report.ai?.assistant?.initialPriority ||"medium";

 return (
 <div className="p-3 max-w-[240px] text-xs font-sans text-slate-600 space-y-2.5">
 <div className="space-y-1">
 <div className="flex items-center gap-1.5">
 <span 
 className="w-2 h-2 rounded-full shrink-0" 
 style={{ backgroundColor: color }}
 />
 <span className="font-black text-slate-800 text-xs block truncate max-w-[180px]">
 {report.ai?.assistant?.title || report.metadata.title}
 </span>
 </div>
 <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider">
 {category.replace("_","")} • Priority: {priority}
 </span>
 </div>

 <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">
 {report.metadata.description}
 </p>

 <div className="border-t border-slate-200 pt-2 flex items-center justify-between gap-2">
 <span className="text-[8px] font-mono text-slate-500">
 ID: #{report.id.slice(0, 6)}
 </span>
 <Link href={`/admin/reports/${report.id}`} className="shrink-0">
 <Button size="sm" className="h-6 px-2 text-[9px] font-bold bg-slate-200 hover:bg-zinc-700 text-slate-800 border border-slate-200 flex items-center gap-1">
 <Eye className="w-2.5 h-2.5" /> Inspect Console
 </Button>
 </Link>
 </div>
 </div>
);
}
