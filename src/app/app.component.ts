import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { bearing, distance, point } from '@turf/turf';
import { firstValueFrom } from 'rxjs';
import { CompassService } from './services/compass.service';
import { GeolocationService } from './services/geolocation.service';

export function getTurfPoint(lat: number, long: number) {
  return point([long, lat]);
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  // templateUrl: './app.component.html',
  template: `
    <div
      style="display: flex; flex-direction: column;  justify-content: center; margin: 50px;"
    >
      <router-outlet></router-outlet>

      <button style="font-size:48px" (click)="startTracking()">
        Start tracking
      </button>

      <p>{{ error }}</p>

      <div *ngIf="geolocation.position$ | async as position">
        <!--  -->
        <p>Long: {{ position?.coords?.longitude }}</p>
        <p>Lat: {{ position?.coords?.latitude }}</p>
        <!--  -->
        <p>bearing:{{ bearingTotarget }}</p>
        <p>distance:{{ distanceToTargetMeters }}</p>

        <div *ngIf="compass.heading$ | async as heading">
          <div>
            <p>Compass: {{ heading }}</p>
          </div>
          <div
            class="circle"
            [style.transform]="
              'rotate(' + (45 + bearingTotarget - heading) + 'deg)'
            "
          >
            <div class="circle__half"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'bearing';
  error = '';

  targetLat = 0;
  targetLong = 0;
  distanceThresholdDistanceVisibleKm = 0;

  bearingTotarget = -1;
  distanceToTargetMeters = -1;

  inteval: any = null;

  rotationToTargetCss = 45;

  constructor(
    private activatedRoute: ActivatedRoute,
    public geolocation: GeolocationService,
    public compass: CompassService
  ) {}

  ngOnInit(): void {
    // ME : 45.18019252229832, 5.748618125284669

    // Grenoble - Bastille 45.19870514996176, 12.244026661872446
    const DEFAULT_LAT = 45.19870514996176;
    const DEFAULT_LONG = 5.724700785718445;

    this.activatedRoute.queryParams.subscribe((params) => {
      this.targetLat = params['lat'] || DEFAULT_LAT;
      this.targetLong = params['long'] || DEFAULT_LONG;
      this.distanceThresholdDistanceVisibleKm = params['distance'] || 5;
    });

    const self = this;
    this.inteval = setInterval(async () => {
      self.update();
    }, 1);
  }

  async update() {
    const myPosition = await firstValueFrom(this.geolocation.position$);
    if (!myPosition) {
      console.log('No position available');
      return undefined;
    }
    const myPoint = getTurfPoint(
      myPosition?.coords.latitude,
      myPosition?.coords.longitude
    );
    const targetPoint = getTurfPoint(this.targetLat, this.targetLong);
    this.bearingTotarget = (360 + bearing(myPoint, targetPoint)) % 360;
    this.distanceToTargetMeters = distance(myPoint, targetPoint, {
      units: 'meters',
    });

    try {
      const heading = await firstValueFrom(this.compass.heading$);
      if (!heading) {
        console.log('No heading available');
        return;
      }
      this.rotationToTargetCss = 45 + this.bearingTotarget - heading;
    } catch (error) {}
  }

  ngOnDestroy() {
    this.geolocation.stopTracking();
    this.compass.stopOrientationListener();
    try {
      clearInterval(this.inteval);
    } catch (error) {}
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
