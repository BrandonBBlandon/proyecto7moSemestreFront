import { DecimalPipe, NgClass } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
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
export class ReportsPage implements OnInit {
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

  ngOnInit(): void {
    this.query();
  }

  query(): void {
    this.loading = true;
    this.errorMessage = '';
    this.report = null;
    this.days = [];

    const request = this.createRequest();
    if (!request) {
      this.loading = false;
      return;
    }

    console.log('[Reports] solicitando reportes...');

    request.pipe(
      finalize(() => {
        this.loading = false;
        console.log('[Reports] loading false');
      })
    ).subscribe({
      next: (report: ReportResult) => {
        this.report = report;
        this.days = 'days' in report ? report.days : [];
      },
      error: (error: Error) => {
        this.errorMessage = error.message || 'No se pudo consultar el reporte.';
      }
    });
  }

  riskLabel(level: RiskLevel): string {
    const labels = {
      normal: 'Normal',
      warning: 'Advertencia',
      alarm: 'Alarma'
    };

    return labels[level];
  }

  emptyReport(): boolean {
    return !!this.report && this.report.totalReadings === 0;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private createRequest(): Observable<ReportResult> | null {
    if (this.mode === 'daily') {
      if (!this.dailyDate) {
        this.errorMessage = 'Selecciona una fecha para consultar el reporte diario.';
        return null;
      }

      return this.api.getDailyReport(this.dailyDate);
    }

    if (this.mode === 'range') {
      if (!this.fromDate || !this.toDate) {
        this.errorMessage = 'Selecciona las fechas desde y hasta para consultar el reporte.';
        return null;
      }

      if (this.fromDate > this.toDate) {
        this.errorMessage = 'La fecha inicial no puede ser mayor que la fecha final.';
        return null;
      }

      return this.api.getRangeReport(this.fromDate, this.toDate);
    }

    if (!/^\d{4}-\d{2}$/.test(this.monthValue)) {
      this.errorMessage = 'Selecciona un mes valido para consultar el reporte mensual.';
      return null;
    }

    return this.api.getMonthlyReport(Number(this.monthValue.slice(0, 4)), Number(this.monthValue.slice(5, 7)));
  }
}
