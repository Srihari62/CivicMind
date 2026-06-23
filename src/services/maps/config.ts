/**
 * @file src/services/maps/config.ts
 * @description Google Maps Platform initialization service.
 * Configures and initializes the Google Maps JavaScript API using the latest
 * functional API (setOptions and importLibrary) from '@googlemaps/js-api-loader'.
 */

import { setOptions, importLibrary, LibraryMap } from "@googlemaps/js-api-loader";
import { mapsConfig } from "@/config/maps";

const mapsApiKey = mapsConfig.apiKey;

if (!mapsApiKey && typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  console.warn("Google Maps Warning: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not defined. Map UI components will fail to load.");
}

// Initialize options globally on the client side
if (typeof window !== "undefined") {
  setOptions({
    key: mapsApiKey,
    v: mapsConfig.version,
  });
}

/**
 * Union type representing the supported Google Maps libraries.
 */
export type GoogleMapsLibrary = keyof LibraryMap;

/**
 * Helper utility to safely import a Google Maps library asynchronously.
 * Uses the latest functional API loader.
 * @param name - The name of the library (e.g. 'maps', 'places', 'marker')
 * @returns Google Maps Library instance promise
 */
export async function getMapsLibrary<TLibraryName extends GoogleMapsLibrary>(
  name: TLibraryName
): Promise<LibraryMap[TLibraryName]> {
  if (typeof window === "undefined") {
    throw new Error("Server-side Error: Google Maps client libraries cannot be loaded on the server.");
  }
  
  return await importLibrary(name);
}

/**
 * Geocodes an address string to latitude/longitude coordinates.
 * @param address - Street address or landmark name
 * @returns Latitude/Longitude coordinates object
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  const { Geocoder } = await getMapsLibrary("geocoding");
  const geocoder = new Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location;
        resolve({ lat: location.lat(), lng: location.lng() });
      } else {
        reject(new Error(`Geocoding failed with status: ${status}`));
      }
    });
  });
}

/**
 * Performs reverse-geocoding from latitude/longitude to a readable postal address.
 * @param lat - Latitude coordinate
 * @param lng - Longitude coordinate
 * @returns Human-readable address string
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const { Geocoder } = await getMapsLibrary("geocoding");
  const geocoder = new Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        resolve(results[0].formatted_address);
      } else {
        reject(new Error(`Reverse geocoding failed with status: ${status}`));
      }
    });
  });
}
