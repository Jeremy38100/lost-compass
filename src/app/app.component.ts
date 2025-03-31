import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { bearing, distance, point } from '@turf/turf';
import { firstValueFrom } from 'rxjs';
import { CompassService } from './services/compass.service';
import { GeolocationService } from './services/geolocation.service';

export function getTurfPoint(lat: number, long: number) {
  return point([long, lat]);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  // templateUrl: './app.component.html',
  template: `
    <main class="container-fluid">
      <div class="form">
        <form>
          <fieldset>
            <label>
              🗺️ Coordinates : lat,lng
              <input
                name="coordinates"
                placeholder="45.1989, 5.7248"
                [(ngModel)]="coordinatesTargetInput"
                (change)="onCoordinatesChange()"
              />
            </label>
          </fieldset>
          <label>📐 Arc span °</label>
          <fieldset role="group">
            <button
              [disabled]="circleRadius <= 10"
              (click)="increaseCircleRadius(-10)"
            >
              -
            </button>
            <input name="circleRadius" [(ngModel)]="circleRadius" />
            <button
              [disabled]="circleRadius >= 170"
              (click)="increaseCircleRadius(10)"
            >
              +
            </button>
          </fieldset>
          <fieldset>
            <label>
              <input
                type="checkbox"
                name="isShowDistance"
                [(ngModel)]="isShowDistance"
              />
              📏 Show distance
            </label>
          </fieldset>
          <div style="display: flex; gap: 10px">
            <button
              *ngIf="!isInit"
              (click)="startTrackingData()"
              style="width:100%"
            >
              START
            </button>
            <ng-container *ngIf="isInit">
              <button (click)="update()" style="width:100%">UPDATE</button>
              <button
                *ngIf="!isTracking"
                (click)="startTracking()"
                class="button-red"
                style="width:100%; "
              >
                START TRACKING
              </button>
              <button
                *ngIf="isTracking"
                (click)="stopTracking()"
                class="button-red"
                style="width:100%; "
              >
                STOP TRACKING
              </button>
            </ng-container>
          </div>
        </form>
      </div>

      <div class="content" *ngIf="isInit">
        <kbd [style.opacity]="isShowDistance ? 100 : 0" class="distance">
          {{ distanceStr }}
        </kbd>

        <ng-container *ngIf="geolocation.position$ | async as position">
          <ng-container *ngIf="compass.heading$ | async as heading">
            <div
              class="circle"
              [style.transform]="
                'rotate(' +
                (circleRadius / 2 +
                  bearingTotarget -
                  (isTracking ? heading : lastDeviceHeading)) +
                'deg)'
              "
            >
              <div
                [ngStyle]="{ '--rotation': 180 - circleRadius + 'deg' }"
                class="circle__half"
              ></div>
              <div class="circle_center"></div>
            </div>
          </ng-container>
        </ng-container>
      </div>

      <p>{{ error }}</p>
    </main>
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  error = '';
  trackingInteval: any = null;

  // TARGET
  targetLat = 0;
  targetLong = 0;
  distanceThresholdDistanceVisibleKm = 0;

  // COMPUTED TARGET
  bearingTotarget = -1;
  distanceToTargetMeters = -1;
  lastDeviceHeading = -1;

  rotationToTargetCss = 45;

  circleRadius = 90;
  isShowDistance = false;
  coordinatesTargetInput = '45.1989, 5.7248'; // Bastille

  // STATUS
  isInit = false;
  isTracking = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    public geolocation: GeolocationService,
    public compass: CompassService
  ) {}

  increaseCircleRadius(value: number) {
    this.circleRadius += value;
    this.update().catch();
  }

  onCoordinatesChange() {
    this.update().catch();
  }

  ngOnInit(): void {
    // this.activatedRoute.queryParams.subscribe((params) => {
    //   this.targetLat = DEFAULT_LAT;
    //   this.targetLong = DEFAULT_LONG;
    //   this.distanceThresholdDistanceVisibleKm = params['distance'] || 5;
    // });
  }

  startTracking() {
    this.isTracking = true;
    this.trackingInteval = setInterval(async () => {
      await this.update();
    }, 1);
  }

  stopTracking() {
    this.isTracking = false;
    clearInterval(this.trackingInteval);
    this.trackingInteval = null;
  }

  get distanceStr() {
    if (this.distanceToTargetMeters === -1) {
      return '';
    }

    if (this.isShowDistance) {
      if (this.distanceToTargetMeters > 3000) {
        return `${(this.distanceToTargetMeters / 1000).toFixed(1)} km`;
      }
      return `${this.distanceToTargetMeters.toFixed(0)} m`;
    }
    return '';
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

    const [lat, lng] = this.coordinatesTargetInput
      .split(',')
      .map((e) => e.trim());
    const targetPoint = getTurfPoint(Number(lat), Number(lng));
    this.bearingTotarget = (360 + bearing(myPoint, targetPoint)) % 360;
    this.distanceToTargetMeters = distance(myPoint, targetPoint, {
      units: 'meters',
    });

    try {
      const heading = await firstValueFrom(this.compass.heading$);
      this.lastDeviceHeading = heading ?? -1;
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
      clearInterval(this.trackingInteval);
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

  async startTrackingData() {
    this.startGeolocationTracking();
    await this.startCompassTracking();
    this.isInit = true;
    setTimeout(() => {
      this.update();
    }, 200);
  }
}
