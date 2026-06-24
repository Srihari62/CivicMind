/**
 * @file src/services/location/browser-location.service.ts
 * @description Service for retrieving current location coordinates using the browser Geolocation API.
 */

export interface BrowserCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export class BrowserLocationService {
  /**
   * Retrieves the current device GPS position.
   */
  static getCurrentLocation(options?: PositionOptions): Promise<BrowserCoordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Browser geolocation is not supported by your browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let message = "Failed to retrieve your location.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location permission denied. Please allow location access in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information is unavailable. Please check your GPS signal.";
              break;
            case error.TIMEOUT:
              message = "Location request timed out. Please try again.";
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
          ...options,
        }
      );
    });
  }
}
