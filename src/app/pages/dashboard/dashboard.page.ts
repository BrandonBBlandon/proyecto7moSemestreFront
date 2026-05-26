import { Component, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, Subscription } from 'rxjs';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent
} from '@ionic/angular/standalone';

import { CurrentStatus, Reading } from '../../core/models/reading.model';
import { SmokeMonitoringApiService } from '../../core/services/smoke-monitoring-api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { ReadingCardComponent } from '../../shared/components/reading-card/reading-card.component';
import { StatusCardComponent } from '../../shared/components/status-card/status-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonTitle,
    IonToolbar,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    ReadingCardComponent,
    StatusCardComponent
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss'
})
export class DashboardPage implements OnDestroy {
  current: CurrentStatus | null = null;
  readings: Reading[] = [];
  loading = true;
  errorMessage = '';

  private refreshSubscription?: Subscription;
  private readonly refreshKey = 'smoke_refresh_ms';

  constructor(private readonly api: SmokeMonitoringApiService) {}

  ionViewWillEnter(): void {
    this.load();
    this.startAutoRefresh();
  }

  ionViewWillLeave(): void {
    this.stopAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  load(silent = false, event?: RefresherCustomEvent): void {
    if (!silent) {
      this.loading = true;
    }

    this.errorMessage = '';
    forkJoin({
      current: this.api.getCurrentStatus(),
      latest: this.api.getLatestReadings(10)
    }).pipe(
      finalize(() => {
        this.loading = false;
        event?.target.complete();
      })
    ).subscribe({
      next: ({ current, latest }) => {
        this.current = current;
        this.readings = latest.items;
      },
      error: (error: Error) => {
        this.errorMessage = error.message || 'No se pudo actualizar el dashboard.';
      }
    });
  }

  unusualCount(): number {
    return this.readings.filter((reading) => reading.status === 'warning' || reading.status === 'alarm').length;
  }

  hasUnusualEvent(): boolean {
    return this.readings.some((reading) => reading.status === 'alarm') || this.unusualCount() >= 3;
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    const intervalMs = Math.max(Number(localStorage.getItem(this.refreshKey) || 5000), 1000);
    this.refreshSubscription = new Subscription();
    const id = window.setInterval(() => this.load(true), intervalMs);
    this.refreshSubscription.add(() => window.clearInterval(id));
  }

  private stopAutoRefresh(): void {
    this.refreshSubscription?.unsubscribe();
    this.refreshSubscription = undefined;
  }
}
