/**
 * @file src/components/maps/MapPicker.tsx
 * @description Interactive Google Map location picker with address autocomplete, marker dragging, click-to-pin, and Geocoding.
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { LocationService } from "@/services/location/location.service";
import { LocationSearch } from "./LocationSearch";
import { LocationControls } from "./LocationControls";
import { ReportLocation } from "@/types";
import { AlertCircle, Loader2 } from "lucide-react";

interface MapPickerProps {
  initialLatitude?: number;
  initialLongitude?: number;
  initialLocation?: ReportLocation | null;
  onLocationChange: (location: ReportLocation) => void;
}

// Inner helper to synchronize map camera panning when coordinates are updated
function MapCameraHandler({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo({ lat, lng });
    }
  }, [lat, lng, map]);
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

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
        setError("Google Maps geocoder service failed. Using raw GPS coordinates.");
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
  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setPosition([lat, lng]);
      performGeocoding(lat, lng);
    }
  };

  // Handle map click events
  const handleMapClick = (e: any) => {
    if (e.detail.latLng) {
      const lat = e.detail.latLng.lat;
      const lng = e.detail.latLng.lng;
      setPosition([lat, lng]);
      performGeocoding(lat, lng);
    }
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

      {/* Google Map panel container */}
      <div className="h-[280px] w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/40 relative shadow-inner">
        {!apiKey ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/60 backdrop-blur-sm gap-2">
            <AlertCircle className="h-8 w-8 text-amber-500 animate-bounce" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Map Service Unavailable</span>
            <span className="text-[11px] text-slate-500 max-w-[260px] leading-relaxed">
              Google Maps API Key is missing. You can still manually enter the address and coordinates below.
            </span>
          </div>
        ) : (
          <Map
            defaultZoom={15}
            defaultCenter={{ lat: position[0], lng: position[1] }}
            mapId="DEMO_MAP_ID"
            onClick={handleMapClick}
            gestureHandling="greedy"
            disableDefaultUI={false}
            style={{ width: "100%", height: "100%" }}
          >
            <AdvancedMarker
              position={{ lat: position[0], lng: position[1] }}
              draggable={true}
              onDragEnd={handleMarkerDragEnd}
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute w-8 h-8 rounded-full bg-indigo-500/30 animate-ping" />
                <div className="w-5 h-5 rounded-full bg-indigo-650 border-2 border-white shadow-lg flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
            </AdvancedMarker>
            <MapCameraHandler lat={position[0]} lng={position[1]} />
          </Map>
        )}
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
