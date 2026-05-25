import { DecimalPipe, NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';

import { ReportDay, ReportResult, RiskLevel } from '../../core/models/report.model';
import { SmokeMonitoringApiService } from '../../core/services/smoke-monitoring-api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

type ReportMode = 'daily' | 'range' | 'monthly';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    NgClass,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent
  ],
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss'
})
export class ReportsPage {
  mode: ReportMode = 'daily';
  dailyDate = this.today();
  fromDate = this.today();
  toDate = this.today();
  monthValue = this.today().slice(0, 7);
  report: ReportResult | null = null;
  days: ReportDay[] = [];
  loading = false;
  errorMessage = '';

  constructor(private readonly api: SmokeMonitoringApiService) {}

  query(): void {
    this.loading = true;
    this.errorMessage = '';
    this.report = null;
    this.days = [];

    const request: Observable<ReportResult> =
      this.mode === 'daily'
        ? this.api.getDailyReport(this.dailyDate)
        : this.mode === 'range'
          ? this.api.getRangeReport(this.fromDate, this.toDate)
          : this.api.getMonthlyReport(Number(this.monthValue.slice(0, 4)), Number(this.monthValue.slice(5, 7)));

    request.subscribe({
      next: (report: ReportResult) => {
        this.loading = false;
        this.report = report;
        this.days = 'days' in report ? report.days : [];
      },
      error: (error: Error) => {
        this.loading = false;
        this.errorMessage = error.message || 'No se pudo consultar el reporte.';
      }
    });
  }

  riskLabel(level: RiskLevel): string {
    const labels = {
      low: 'Bajo',
      medium: 'Medio',
      high: 'Alto'
    };

    return labels[level];
  }

  emptyReport(): boolean {
    return !!this.report && this.report.totalReadings === 0;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
