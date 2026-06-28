/**
 * @file src/components/maps/LocationSearch.tsx
 * @description Google Places address autocompleting search box component.
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, MapPin, X, AlertCircle } from "lucide-react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { ReportLocation } from "@/types";

interface LocationSearchProps {
  onSelectLocation: (location: ReportLocation) => void;
  className?: string;
}

export function LocationSearch({ onSelectLocation, className = "" }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  const placesLibrary = useMapsLibrary("places");
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!placesLibrary || !inputRef.current) return;

    const gAutocomplete = new placesLibrary.Autocomplete(inputRef.current, {
      fields: ["geometry", "formatted_address", "address_components", "place_id"],
    });

    gAutocomplete.addListener("place_changed", () => {
      const place = gAutocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      const addressComponents = place.address_components || [];
      let locality = "";
      let subLocality = "";
      let city = "";
      let district = "";
      let state = "";
      let country = "";
      let postalCode = "";

      for (const comp of addressComponents) {
        const types = comp.types || [];
        if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
          subLocality = comp.long_name;
        } else if (types.includes("locality")) {
          locality = comp.long_name;
        } else if (types.includes("administrative_area_level_2")) {
          city = comp.long_name;
        } else if (types.includes("administrative_area_level_3")) {
          district = comp.long_name;
        } else if (types.includes("administrative_area_level_1")) {
          state = comp.long_name;
        } else if (types.includes("country")) {
          country = comp.long_name;
        } else if (types.includes("postal_code")) {
          postalCode = comp.long_name;
        }
      }

      const resolvedCity = city || locality || "";

      const location: ReportLocation = {
        latitude: lat,
        longitude: lng,
        formattedAddress: place.formatted_address || "",
        placeId: place.place_id || "",
        locality: locality || subLocality || "",
        subLocality: subLocality || "",
        city: resolvedCity,
        district: district || "",
        state: state || "",
        country: country || "",
        postalCode: postalCode || "",
      };

      setQuery(place.formatted_address || "");
      onSelectLocation(location);
    });

    setAutocomplete(gAutocomplete);
  }, [placesLibrary, onSelectLocation]);

  const handleClear = () => {
    setQuery("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative flex items-center w-full">
        <span className="absolute left-3.5 text-slate-400">
          <Search className="h-4 w-4" />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={!apiKey}
          placeholder={apiKey ? "Search address, landmark or city..." : "Map search disabled (Missing API Key)"}
          className="w-full pl-10 pr-10 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all backdrop-blur-md disabled:cursor-not-allowed disabled:opacity-55"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
