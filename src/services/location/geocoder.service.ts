/**
 * @file src/services/location/geocoder.service.ts
 * @description Service for forward and reverse geocoding using Google Maps Geocoding API.
 */

import { ReportLocation } from "@/types";

export class GeocoderService {
  private static getApiKey() {
    return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  }

  /**
   * Helper to perform fetch requests.
   */
  private static async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  /**
   * Parses the Google Geocoding API response format into the unified ReportLocation schema.
   */
  private static parseGoogleResult(result: any): ReportLocation {
    const coords = result.geometry.location;
    const lat = coords.lat;
    const lng = coords.lng;

    const addressComponents = result.address_components || [];
    
    let locality = "";
    let subLocality = "";
    let city = "";
    let district = "";
    let state = "";
    let country = "";
    let postalCode = "";

    // Parse Google address components
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

    // Fallbacks for city / locality structure
    const resolvedCity = city || locality || "";

    return {
      latitude: lat,
      longitude: lng,
      formattedAddress: result.formatted_address || "",
      placeId: result.place_id || "",
      locality: locality || subLocality || "",
      subLocality: subLocality || "",
      city: resolvedCity,
      district: district || "",
      state: state || "",
      country: country || "",
      postalCode: postalCode || "",
    };
  }

  /**
   * Resolves coordinates (latitude, longitude) into structured location details.
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<ReportLocation> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        latitude,
        longitude,
        formattedAddress: `GPS: [${latitude.toFixed(6)}, ${longitude.toFixed(6)}]`,
        placeId: "",
        locality: "",
        subLocality: "",
        city: "",
        district: "",
        state: "",
        country: "",
        postalCode: "",
      };
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
    try {
      const data = await this.fetchJson<any>(url);
      if (data.status !== "OK" || !data.results || data.results.length === 0) {
        throw new Error(`Google Maps Geocoding API returned status: ${data.status}`);
      }
      return this.parseGoogleResult(data.results[0]);
    } catch (error) {
      console.warn("Google reverse geocoding failed, falling back.", error);
      return {
        latitude,
        longitude,
        formattedAddress: `GPS: [${latitude.toFixed(6)}, ${longitude.toFixed(6)}]`,
        placeId: "",
        locality: "",
        subLocality: "",
        city: "",
        district: "",
        state: "",
        country: "",
        postalCode: "",
      };
    }
  }

  /**
   * Searches for addresses matching a query string and returns structured search results.
   */
  static async geocode(query: string): Promise<ReportLocation[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return [];
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${apiKey}`;
    try {
      const data = await this.fetchJson<any>(url);
      if (data.status !== "OK" || !data.results) {
        return [];
      }
      return data.results.map((result: any) => this.parseGoogleResult(result));
    } catch (error) {
      console.error("Google forward geocoding failed.", error);
      return [];
    }
  }
}
