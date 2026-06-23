/**
 * @file src/services/maps/location.service.ts
 * @description Location utility service isolating geolocation querying from the browser APIs.
 * Supports standard browser GPS retrieval and creates a interface layer for future manual map pins.
 */

import { AppError } from "@/utils/error";

export interface Coordinates {
  latitude: number;
  longitude: number;
  address?: string;
}

export class LocationService {
  /**
   * Retrieves coordinates using the browser's Geolocation API.
   * Prompts the user for permission.
   * @returns Promise resolving to coordinates
   */
  public static async getCurrentLocation(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        reject(
          new AppError({
            message: "Geolocation is not supported by your browser.",
            code: "GEOLOCATION_UNSUPPORTED",
            statusCode: 400,
          })
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            // Fallback address representation since physical address resolve requires Google Geocoder API
            address: `GPS Coordinate: [${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}]`,
          });
        },
        (error) => {
          let message = "Failed to retrieve your location.";
          let code = "GEOLOCATION_ERROR";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location permission denied. Please allow access to report issues with coordinates.";
              code = "GEOLOCATION_PERMISSION_DENIED";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "GPS satellite signals are currently unavailable.";
              code = "GEOLOCATION_UNAVAILABLE";
              break;
            case error.TIMEOUT:
              message = "The request to get your location timed out.";
              code = "GEOLOCATION_TIMEOUT";
              break;
          }

          reject(
            new AppError({
              message,
              code,
              statusCode: 400,
            })
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Placeholder/interface for future manual location pin placements.
   * @param latitude - Manually set latitude coordinate
   * @param longitude - Manually set longitude coordinate
   */
  public static async getAddressFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<string> {
    // In future sprints, this will use Google Maps Geocoding API to resolve a street address.
    // For now, return a placeholder string representation.
    return `Location at [${latitude.toFixed(5)}, ${longitude.toFixed(5)}]`;
  }
}
