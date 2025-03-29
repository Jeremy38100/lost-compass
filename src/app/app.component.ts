import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CompassService } from './services/compass.service';
import { GeolocationService } from './services/geolocation.service';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  // templateUrl: './app.component.html',
  template: `
    <div
      style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 50px;"
    >
      <router-outlet></router-outlet>

      <button style="font-size:48px" (click)="startTracking()">
        Start tracking
      </button>

      <p>{{ error }}</p>
      <div></div>

      <div *ngIf="geolocation.position$ | async as position">
        <p>Long: {{ position?.coords?.longitude }}</p>
        <p>Lat: {{ position?.coords?.latitude }}</p>
      </div>

      <p *ngIf="compass.heading$ | async as heading">Compass: {{ heading }}</p>
    </div>
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'bearing';
  error = '';

  constructor(
    public geolocation: GeolocationService,
    public compass: CompassService
  ) {}

  ngOnDestroy() {
    this.geolocation.stopTracking();
    this.compass.stopOrientationListener();
  }

  private startGeolocationTracking() {
    this.geolocation.startTracking((error) => {
      // TODO
      console.error('Geolocation error:', error);
      this.error = 'Failed to get geolocation permission';
    });
  }

  private async startCompassTracking() {
    try {
      await this.compass.requestPermission();
      this.compass.startOrientationListener();
    } catch (error) {
      console.error('Compass permission error:', error);
      this.error = 'Failed to get compass permission';
    }
  }

  async startTracking() {
    this.startGeolocationTracking();
    await this.startCompassTracking();
  }
}
