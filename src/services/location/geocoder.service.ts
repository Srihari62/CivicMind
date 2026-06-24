/**
 * @file src/services/location/geocoder.service.ts
 * @description Service for forward and reverse geocoding using OpenStreetMap Nominatim API.
 */

import { ReportLocation } from "@/types";

export interface NominatimAddress {
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  district?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

export interface NominatimResult {
  place_id: number;
  licence: string;
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
}

export class GeocoderService {
  private static NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

  /**
   * Helper to perform fetch requests with Nominatim compliant User-Agent headers.
   */
  private static async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "CivicMind-OpenStreetMap-App/1.0 (srihari.hackathon@example.com)",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Parses the Nominatim API response format into the unified ReportLocation schema.
   */
  private static parseNominatimResult(result: NominatimResult): ReportLocation {
    const address = result.address || {};
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Extract locality (neighborhood, suburb, etc.)
    const locality = address.suburb || address.neighbourhood || address.quarter || "";
    // Extract sublocality (typically the road/street)
    const subLocality = address.road || "";
    // Extract city (city, town, village, or municipality)
    const city = address.city || address.town || address.village || address.municipality || "";
    // Extract district (district or county)
    const district = address.district || address.county || "";
    // Extract state
    const state = address.state || "";
    // Extract country
    const country = address.country || "";
    // Extract postal code
    const postalCode = address.postcode || "";

    return {
      latitude: lat,
      longitude: lng,
      formattedAddress: result.display_name,
      placeId: String(result.place_id),
      locality,
      subLocality,
      city,
      district,
      state,
      country,
      postalCode,
    };
  }

  /**
   * Resolves coordinates (latitude, longitude) into structured location details.
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<ReportLocation> {
    const url = `${this.NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;
    try {
      const result = await this.fetchJson<NominatimResult>(url);
      if (!result || !result.lat) {
        throw new Error("No address components resolved for these coordinates.");
      }
      return this.parseNominatimResult(result);
    } catch (error) {
      console.warn("Reverse geocoding failed, falling back to basic location data.", error);
      // Fallback schema (Coordinates remain the source of truth)
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

    const encodedQuery = encodeURIComponent(query);
    const url = `${this.NOMINATIM_BASE_URL}/search?format=jsonv2&q=${encodedQuery}&addressdetails=1&limit=5`;
    try {
      const results = await this.fetchJson<NominatimResult[]>(url);
      if (!results || !Array.isArray(results)) {
        return [];
      }
      return results.map((result) => this.parseNominatimResult(result));
    } catch (error) {
      console.error("Geocoding address search failed.", error);
      return [];
    }
  }
}
