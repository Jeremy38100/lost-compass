import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CompassService {
  private headingSubject = new BehaviorSubject<number | null>(null);
  heading$ = this.headingSubject.asObservable();

  constructor() {}

  private async assertPermission() {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('Permission denied');
    }
  }

  async startOrientationListener() {
    await this.assertPermission();
    window.addEventListener('deviceorientation', (event) => {
      if (event.alpha !== null) {
        // Direction values are measured in degrees starting at due north and continuing clockwise around the compass.
        // Thus, north is 0 degrees, east is 90 degrees, south is 180 degrees, and so on.
        // A negative value indicates an invalid direction.
        const compassHeading = (event as any).webkitCompassHeading;
        this.headingSubject.next(compassHeading);
      }
    });
  }

  stopOrientationListener() {
    window.removeEventListener('deviceorientation', () => {});
    this.headingSubject.next(null);
  }

  async requestPermission(): Promise<boolean> {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      (DeviceOrientationEvent as any).requestPermission
    ) {
      try {
        const permission = await (
          DeviceOrientationEvent as any
        ).requestPermission();
        return permission === 'granted';
      } catch (e) {
        console.error('Permission refusée', e);
        return false;
      }
    }
    return true;
  }
}
