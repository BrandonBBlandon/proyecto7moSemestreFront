import { DatePipe, NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { finalize } from 'rxjs';
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

import { Incident } from '../../core/models/incident.model';
import { SmokeMonitoringApiService } from '../../core/services/smoke-monitoring-api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
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
    LoadingStateComponent
  ],
  templateUrl: './history.page.html',
  styleUrl: './history.page.scss'
})
export class HistoryPage {
  incidents: Incident[] = [];
  loading = true;
  errorMessage = '';

  constructor(private readonly api: SmokeMonitoringApiService) {}

  ionViewWillEnter(): void {
    this.load();
  }

  load(event?: RefresherCustomEvent): void {
    this.loading = !event;
    this.errorMessage = '';

    this.api.getIncidents(20).pipe(
      finalize(() => {
        this.loading = false;
        event?.target.complete();
      })
    ).subscribe({
      next: (response) => {
        this.incidents = response.items;
      },
      error: (error: Error) => {
        this.errorMessage = error.message || 'No se pudo consultar el historial.';
      }
    });
  }

  severityLabel(severity: string): string {
    return severity === 'alarm' ? 'Alarma' : 'Advertencia';
  }
}
