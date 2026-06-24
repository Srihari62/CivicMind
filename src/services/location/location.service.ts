/**
 * @file src/services/location/location.service.ts
 * @description Facade service coordinating geolocation and geocoding operations across the application.
 */

import { BrowserLocationService } from "./browser-location.service";
import { GeocoderService } from "./geocoder.service";
import { ReportLocation } from "@/types";

export class LocationService {
  /**
   * Retrieves browser device coordinates.
   */
  static async getCurrentLocation() {
    const coords = await BrowserLocationService.getCurrentLocation();
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  }

  /**
   * Resolves address from coordinates.
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<ReportLocation> {
    return GeocoderService.reverseGeocode(latitude, longitude);
  }

  /**
   * Search location autocomplete / address query.
   */
  static async geocode(query: string): Promise<ReportLocation[]> {
    return GeocoderService.geocode(query);
  }
}
