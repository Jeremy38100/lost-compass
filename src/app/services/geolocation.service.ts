import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GeolocationService {
  private watchId: number | null = null; // Stores the ID of the geolocation watch process.

  private positionSubject = new BehaviorSubject<GeolocationPosition | null>(
    null
  ); // Subject to emit geolocation position updates.
  position$ = this.positionSubject.asObservable(); // Observable to allow components to subscribe to position updates.

  startTracking(errorCallback?: (error: GeolocationPositionError) => void) {
    const isGeolocationAvailable = 'geolocation' in navigator;
    if (!isGeolocationAvailable) {
      // TODO
      console.error('Geolocation is not supported by this browser.');
    }

    const options: PositionOptions = {
      enableHighAccuracy: true, // Use high accuracy for location (may consume more battery).
      timeout: 10000, // Maximum time (in ms) to wait for a position before throwing an error.
      maximumAge: 0, // Do not use cached positions; always fetch fresh data.
    };
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.positionSubject.next(position); // Emit the position update to subscribers.
      },
      (error) => {
        console.error('Geolocation error:', error);
        this.positionSubject.next(null); // Emit null to indicate an error.
        if (errorCallback) {
          errorCallback(error); // Call the provided error callback if available.
        }
      },
      options
    );
  }

  stopTracking() {
    if (this.watchId !== null) {
      // Clear the geolocation watch process using its ID.
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null; // Reset the watchId to indicate tracking has stopped.
    }
  }
}
