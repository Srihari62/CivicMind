/**
 * @file src/components/maps/MapPicker.tsx
 * @description Interactive Leaflet map location picker with address autocomplete, marker dragging, click-to-pin, and Nominatim geocoding.
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { LocationService } from "@/services/location/location.service";
import { LocationSearch } from "./LocationSearch";
import { LocationControls } from "./LocationControls";
import { ReportLocation } from "@/types";
import { AlertCircle, Loader2 } from "lucide-react";

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

interface MapPickerProps {
  initialLatitude?: number;
  initialLongitude?: number;
  initialLocation?: ReportLocation | null;
  onLocationChange: (location: ReportLocation) => void;
}

// Inner helper to handle click events on the map
function MapEventsHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Inner helper to synchronize map camera panning when coordinates are updated
function MapCameraHandler({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function MapPicker({
  initialLatitude = 12.9716, // Default to Bengaluru
  initialLongitude = 77.5946,
  initialLocation = null,
  onLocationChange,
}: MapPickerProps) {
  const [position, setPosition] = useState<[number, number]>([
    initialLocation?.latitude || initialLatitude,
    initialLocation?.longitude || initialLongitude,
  ]);

  const [locationData, setLocationData] = useState<ReportLocation>({
    latitude: initialLocation?.latitude || initialLatitude,
    longitude: initialLocation?.longitude || initialLongitude,
    formattedAddress: initialLocation?.formattedAddress || "Resolving location...",
    placeId: initialLocation?.placeId || "",
    locality: initialLocation?.locality || "",
    subLocality: initialLocation?.subLocality || "",
    city: initialLocation?.city || "",
    district: initialLocation?.district || "",
    state: initialLocation?.state || "",
    country: initialLocation?.country || "",
    postalCode: initialLocation?.postalCode || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize initial location when parsed
  useEffect(() => {
    if (initialLocation) {
      setPosition([initialLocation.latitude, initialLocation.longitude]);
      setLocationData(initialLocation);
    }
  }, [initialLocation]);

  // Reverse geocoding helper triggered whenever coordinates change
  const performGeocoding = useCallback(
    async (lat: number, lng: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await LocationService.reverseGeocode(lat, lng);
        setLocationData(result);
        onLocationChange(result);
      } catch (err) {
        console.warn("Reverse geocode request failed:", err);
        setError("Nominatim geocoder service failed. Using raw GPS coordinates.");
        const fallback: ReportLocation = {
          ...locationData,
          latitude: lat,
          longitude: lng,
          formattedAddress: `GPS: [${lat.toFixed(6)}, ${lng.toFixed(6)}]`,
        };
        setLocationData(fallback);
        onLocationChange(fallback);
      } finally {
        setLoading(false);
      }
    },
    [onLocationChange, locationData]
  );

  // Init reverse geocoding on mount if formattedAddress is missing
  useEffect(() => {
    if (!initialLocation && locationData.formattedAddress === "Resolving location...") {
      performGeocoding(position[0], position[1]);
    }
  }, [initialLocation, locationData.formattedAddress, performGeocoding, position]);

  // Handle marker drag event completion
  const handleMarkerDragEnd = (e: L.DragEndEvent) => {
    const marker = e.target;
    if (marker) {
      const latLng = marker.getLatLng();
      setPosition([latLng.lat, latLng.lng]);
      performGeocoding(latLng.lat, latLng.lng);
    }
  };

  // Handle map click events
  const handleMapClick = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    performGeocoding(lat, lng);
  };

  // Handle search autocomplete suggestion selections
  const handlePlaceSelect = (selected: ReportLocation) => {
    setPosition([selected.latitude, selected.longitude]);
    setLocationData(selected);
    onLocationChange(selected);
  };

  // Handle browser GPS querying
  const handleUseCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await LocationService.getCurrentLocation();
      setPosition([coords.latitude, coords.longitude]);
      await performGeocoding(coords.latitude, coords.longitude);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not retrieve browser GPS.");
    } finally {
      setLoading(false);
    }
  };

  // Handle manual address edits
  const handleAddressChange = (address: string) => {
    const updated = {
      ...locationData,
      formattedAddress: address,
    };
    setLocationData(updated);
    onLocationChange(updated);
  };

  // Handle manual coordinates overrides
  const handleCoordsChange = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    performGeocoding(lat, lng);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Search Input bar */}
      <LocationSearch onSelectLocation={handlePlaceSelect} className="w-full" />

      {/* Geocoding Notice bar */}
      {loading && (
        <div className="flex items-center gap-2 text-[11px] text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-xl">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Resolving location...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Leaflet Map panel container */}
      <div className="h-[280px] w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/40 relative z-10 shadow-inner">
        <MapContainer
          center={position}
          zoom={15}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={position}
            draggable={true}
            eventHandlers={{
              dragend: handleMarkerDragEnd,
            }}
          />
          <MapEventsHandler onClick={handleMapClick} />
          <MapCameraHandler center={position} />
        </MapContainer>
      </div>

      {/* Selected coordinate controls panel */}
      <LocationControls
        location={locationData}
        loading={loading}
        onUseCurrentLocation={handleUseCurrentLocation}
        onAddressChange={handleAddressChange}
        onCoordsChange={handleCoordsChange}
      />
    </div>
  );
}

export default MapPicker;
