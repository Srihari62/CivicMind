/**
 * @file src/config/maps.ts
 * @description Google Maps Platform configuration parameters.
 * Houses map centering defaults, libraries, and loader settings.
 */

import { env } from "./env";

export const mapsConfig = {
  apiKey: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  version: "weekly",
  defaultCenter: {
    lat: 37.7749, // Default to San Francisco
    lng: -122.4194,
  },
  defaultZoom: 12,
  // Required library names for places autocompletion and advanced mapping
  libraries: ["places", "marker", "geometry"] as const,
} as const;

export default mapsConfig;
