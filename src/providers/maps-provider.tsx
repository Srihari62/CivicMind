/**
 * @file src/providers/maps-provider.tsx
 * @description Google Maps SDK Context Provider.
 * Triggers lazy-loading of the Maps JavaScript API via the functional loader API,
 * tracking loading status and runtime failure states.
 */

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { mapsConfig } from "@/config/maps";

interface MapsContextType {
  isLoaded: boolean;
  error: Error | null;
}

const MapsContext = createContext<MapsContextType>({
  isLoaded: false,
  error: null,
});

export function MapsProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    const initializeMaps = async () => {
      try {
        if (!mapsConfig.apiKey) {
          throw new Error("Google Maps API Key is missing. Check your NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.");
        }

        // Initialize Options dynamically on the client side
        setOptions({
          key: mapsConfig.apiKey,
          v: mapsConfig.version,
        });

        // Trigger Google Maps JS API script injection by importing the core 'maps' module
        await importLibrary("maps");

        if (active) {
          setIsLoaded(true);
        }
      } catch (err) {
        console.error("Maps Provider Loader Error:", err);
        if (active) {
          setError(err instanceof Error ? err : new Error("Failed to initialize Google Maps JS API"));
        }
      }
    };

    initializeMaps();

    return () => {
      active = false;
    };
  }, []);

  return (
    <MapsContext.Provider value={{ isLoaded, error }}>
      {children}
    </MapsContext.Provider>
  );
}

/**
 * Custom hook to consume the MapsContext.
 */
export const useMaps = () => useContext(MapsContext);
export default MapsProvider;
