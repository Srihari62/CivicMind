"use client";

import React from "react";
import { APIProvider } from "@vis.gl/react-google-maps";

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn("Google Maps API Key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) is missing. Map features will display fallbacks.");
    return <>{children}</>;
  }

  return (
    <APIProvider apiKey={apiKey} version="3.64" libraries={["places", "marker", "visualization"]}>
      {children}
    </APIProvider>
  );
}
