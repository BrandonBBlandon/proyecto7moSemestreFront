import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Incident, IncidentsResponse } from '../models/incident.model';
import { CurrentStatus, DeviceStatus, EnvironmentStatus, LatestReadingsResponse, Reading } from '../models/reading.model';
import { BaseReport, DailyReport, MonthlyReport, RangeReport, ReportDay, RiskLevel } from '../models/report.model';
import { LoginResponse } from '../models/user.model';

interface LegacyEnvelope<T> {
  ok?: boolean;
  data?: T;
  message?: string;
}

interface LegacyReportSummary {
  totalReadings?: number;
  averageValue?: number;
  maxValue?: number;
  minValue?: number;
  normalCount?: number;
  warningCount?: number;
  alarmCount?: number;
}

interface LegacyReportDay extends LegacyReportSummary {
  date: string;
}

interface LegacyRangeReport {
  from: string;
  to: string;
  summary: LegacyReportSummary;
  byDay: LegacyReportDay[];
}

interface LegacyMonthlyReport {
  month: string;
  summary: LegacyReportSummary;
  byDay: LegacyReportDay[];
}

interface LegacyRecentReport extends LegacyReportSummary {
  readings?: LegacyReading[];
}

interface LegacyReading {
  id: number;
  sensorValue: number;
  processedValue?: number;
  status: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SmokeMonitoringApiService {
  private readonly apiUrlStorageKey = 'https://proyecto7mosemestre.onrender.com';

  constructor(private readonly http: HttpClient) {}

  getApiUrl(): string {
    return localStorage.getItem(this.apiUrlStorageKey) || environment.apiUrl;
  }

  setApiUrl(value: string): void {
    const normalized = value.trim().replace(/\/+$/, '');
    if (normalized) {
      localStorage.setItem(this.apiUrlStorageKey, normalized);
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.url('/api/auth/login'), { username, password });
  }

  getCurrentStatus(): Observable<CurrentStatus> {
    return this.http.get<CurrentStatus>(this.url('/api/monitoring/current')).pipe(
      map((status) => this.normalizeCurrentStatus(status)),
      catchError(() => this.getCurrentStatusFromLegacyReadings())
    );
  }

  getLatestReadings(limit = 10): Observable<LatestReadingsResponse> {
    const params = new HttpParams().set('limit', limit);

    return this.http.get<LatestReadingsResponse>(this.url('/api/readings/latest'), { params }).pipe(
      map((response) => ({
        items: (response.items || []).map((item) => this.normalizeReading(item))
      })),
      catchError(() =>
        this.http.get<LegacyEnvelope<LegacyReading[]>>(this.url('/api/readings'), { params }).pipe(
          map((response) => ({
            items: (response.data || []).map((item) => this.normalizeReading(item))
          })),
          catchError((error) => this.handleError(error, 'No se pudieron obtener los registros recientes.'))
        )
      )
    );
  }

  getDailyReport(date: string): Observable<DailyReport> {
    const finalParams = new HttpParams().set('date', date);
    const legacyParams = new HttpParams().set('type', 'daily').set('date', date);

    return this.http.get<DailyReport>(this.url('/api/reports/daily'), { params: finalParams }).pipe(
      map((report) => this.normalizeDailyReport(report)),
      catchError(() =>
        this.http.get<LegacyEnvelope<DailyReport>>(this.url('/api/reports'), { params: legacyParams }).pipe(
          map((response) => this.normalizeDailyReport(response.data ? response.data : { date, ...this.emptyBaseReport() })),
          catchError((error) => this.handleError(error, 'No se pudo consultar el reporte diario.'))
        )
      )
    );
  }

  getRangeReport(from: string, to: string): Observable<RangeReport> {
    const finalParams = new HttpParams().set('from', from).set('to', to);
    const legacyParams = new HttpParams().set('type', 'range').set('from', from).set('to', to);

    return this.http.get<RangeReport>(this.url('/api/reports/range'), { params: finalParams }).pipe(
      map((report) => this.normalizeRangeReport(report)),
      catchError(() =>
        this.http.get<LegacyEnvelope<LegacyRangeReport>>(this.url('/api/reports'), { params: legacyParams }).pipe(
          map((response) => this.mapLegacyRangeReport(response.data, from, to)),
          catchError((error) => this.handleError(error, 'No se pudo consultar el reporte por rango.'))
        )
      )
    );
  }

  getMonthlyReport(year: number, month: number): Observable<MonthlyReport> {
    const monthText = String(month).padStart(2, '0');
    const finalParams = new HttpParams().set('year', year).set('month', monthText);
    const legacyParams = new HttpParams().set('type', 'monthly').set('month', `${year}-${monthText}`);

    return this.http.get<MonthlyReport>(this.url('/api/reports/monthly'), { params: finalParams }).pipe(
      map((report) => this.normalizeMonthlyReport(report)),
      catchError(() =>
        this.http.get<LegacyEnvelope<LegacyMonthlyReport>>(this.url('/api/reports'), { params: legacyParams }).pipe(
          map((response) => this.mapLegacyMonthlyReport(response.data, year, month)),
          catchError((error) => this.handleError(error, 'No se pudo consultar el reporte mensual.'))
        )
      )
    );
  }

  getIncidents(limit = 20): Observable<IncidentsResponse> {
    const finalParams = new HttpParams().set('limit', limit);
    const legacyParams = new HttpParams().set('type', 'recent').set('limit', limit);

    return this.http.get<IncidentsResponse>(this.url('/api/incidents'), { params: finalParams }).pipe(
      map((response) => ({ items: response.items || [] })),
      catchError(() =>
        this.http.get<LegacyEnvelope<LegacyRecentReport>>(this.url('/api/reports'), { params: legacyParams }).pipe(
          map((response) => ({ items: this.mapLegacyIncidents(response.data?.readings || []) })),
          catchError(() => of({ items: [] }))
        )
      )
    );
  }

  checkHealth(): Observable<{ ok: boolean }> {
    return this.http.get<{ ok: boolean }>(this.url('/api/health')).pipe(
      map((response) => ({ ok: response.ok === true })),
      catchError(() =>
        this.http.get<LegacyEnvelope<LegacyReading[]>>(this.url('/api/readings'), {
          params: new HttpParams().set('limit', 1)
        }).pipe(
          map((response) => ({ ok: response.ok !== false })),
          catchError((error) => this.handleError(error, 'No hay comunicación con el backend.'))
        )
      )
    );
  }

  saveWifiConfig(ssid: string, password: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(this.url('/api/device/wifi-config'), { ssid, password }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404 || error.status === 0) {
          return of({
            success: false,
            message: 'La configuración Wi-Fi no está disponible en este backend.'
          });
        }

        return this.handleError(error, 'No se pudo guardar la configuración Wi-Fi.');
      })
    );
  }

  private getCurrentStatusFromLegacyReadings(): Observable<CurrentStatus> {
    return this.http.get<LegacyEnvelope<LegacyReading[]>>(this.url('/api/readings'), {
      params: new HttpParams().set('limit', 1)
    }).pipe(
      map((response) => {
        const reading = response.data?.[0];
        if (!reading) {
          return {
            sensorValue: 0,
            processedValue: 0,
            status: 'normal',
            deviceStatus: 'disconnected',
            lastReadingAt: null
          } satisfies CurrentStatus;
        }

        const normalized = this.normalizeReading(reading);
        return {
          sensorValue: normalized.sensorValue,
          processedValue: normalized.processedValue,
          status: normalized.status,
          deviceStatus: this.inferDeviceStatus(normalized.createdAt),
          lastReadingAt: normalized.createdAt
        };
      }),
      catchError((error) => this.handleError(error, 'No se pudo obtener el estado actual.'))
    );
  }

  private url(path: string): string {
    return `${this.getApiUrl()}${path}`;
  }

  private normalizeCurrentStatus(status: CurrentStatus): CurrentStatus {
    return {
      sensorValue: this.toNumber(status.sensorValue),
      processedValue: this.toNumber(status.processedValue ?? status.sensorValue),
      status: this.normalizeStatus(status.status),
      deviceStatus: this.normalizeDeviceStatus(status.deviceStatus),
      lastReadingAt: status.lastReadingAt || null
    };
  }

  private normalizeReading(reading: LegacyReading | Reading): Reading {
    const sensorValue = this.toNumber(reading.sensorValue);
    return {
      id: this.toNumber(reading.id),
      sensorValue,
      processedValue: this.toNumber(reading.processedValue ?? sensorValue),
      status: this.normalizeStatus(reading.status),
      createdAt: reading.createdAt
    };
  }

  private normalizeDailyReport(report: DailyReport): DailyReport {
    return {
      date: report.date,
      ...this.normalizeBaseReport(report)
    };
  }

  private normalizeRangeReport(report: RangeReport): RangeReport {
    return {
      from: report.from,
      to: report.to,
      ...this.normalizeBaseReport(report),
      days: (report.days || []).map((day) => this.normalizeReportDay(day))
    };
  }

  private normalizeMonthlyReport(report: MonthlyReport): MonthlyReport {
    return {
      year: this.toNumber(report.year),
      month: this.toNumber(report.month),
      ...this.normalizeBaseReport(report),
      days: (report.days || []).map((day) => this.normalizeReportDay(day))
    };
  }

  private mapLegacyRangeReport(report: LegacyRangeReport | undefined, from: string, to: string): RangeReport {
    return {
      from: report?.from || from,
      to: report?.to || to,
      ...this.normalizeLegacySummary(report?.summary),
      days: (report?.byDay || []).map((day) => this.mapLegacyDay(day))
    };
  }

  private mapLegacyMonthlyReport(report: LegacyMonthlyReport | undefined, year: number, month: number): MonthlyReport {
    return {
      year,
      month,
      ...this.normalizeLegacySummary(report?.summary),
      days: (report?.byDay || []).map((day) => this.mapLegacyDay(day))
    };
  }

  private normalizeBaseReport(report: BaseReport): BaseReport {
    return {
      totalReadings: this.toNumber(report.totalReadings),
      totalIncidents: this.toNumber(report.totalIncidents),
      averageValue: this.toNumber(report.averageValue),
      maxValue: this.toNumber(report.maxValue),
      alarmTimeSeconds: this.toNumber(report.alarmTimeSeconds),
      riskLevel: this.normalizeRiskLevel(report.riskLevel)
    };
  }

  private normalizeLegacySummary(summary?: LegacyReportSummary): BaseReport {
    const alarmCount = this.toNumber(summary?.alarmCount);
    const warningCount = this.toNumber(summary?.warningCount);
    const totalReadings = this.toNumber(summary?.totalReadings);

    return {
      totalReadings,
      totalIncidents: alarmCount + warningCount,
      averageValue: this.toNumber(summary?.averageValue),
      maxValue: this.toNumber(summary?.maxValue),
      alarmTimeSeconds: 0,
      riskLevel: this.deriveRiskLevel(alarmCount, warningCount, totalReadings)
    };
  }

  private mapLegacyDay(day: LegacyReportDay): ReportDay {
    return {
      date: day.date,
      totalReadings: this.toNumber(day.totalReadings),
      totalIncidents: this.toNumber(day.warningCount) + this.toNumber(day.alarmCount),
      maxValue: this.toNumber(day.maxValue)
    };
  }

  private normalizeReportDay(day: ReportDay): ReportDay {
    return {
      date: day.date,
      totalReadings: this.toNumber(day.totalReadings),
      totalIncidents: this.toNumber(day.totalIncidents),
      maxValue: this.toNumber(day.maxValue)
    };
  }

  private mapLegacyIncidents(readings: LegacyReading[]): Incident[] {
    return readings
      .map((reading) => this.normalizeReading(reading))
      .filter((reading) => reading.status === 'warning' || reading.status === 'alarm')
      .map((reading) => ({
        id: reading.id,
        startedAt: reading.createdAt,
        endedAt: reading.createdAt,
        durationSeconds: null,
        maxValue: reading.processedValue,
        severity: reading.status === 'alarm' ? 'alarm' : 'warning',
        status: 'closed'
      }));
  }

  private emptyBaseReport(): BaseReport {
    return {
      totalReadings: 0,
      totalIncidents: 0,
      averageValue: 0,
      maxValue: 0,
      alarmTimeSeconds: 0,
      riskLevel: 'low'
    };
  }

  private inferDeviceStatus(createdAt: string): DeviceStatus {
    const timestamp = new Date(createdAt).getTime();
    if (!Number.isFinite(timestamp)) {
      return 'error';
    }

    const minutes = (Date.now() - timestamp) / 60000;
    return minutes <= 5 ? 'connected' : 'disconnected';
  }

  private normalizeStatus(status: string): EnvironmentStatus {
    if (status === 'alarm' || status === 'warning') {
      return status;
    }

    return 'normal';
  }

  private normalizeDeviceStatus(status: string): DeviceStatus {
    if (status === 'connected' || status === 'disconnected' || status === 'error') {
      return status;
    }

    return 'error';
  }

  private normalizeRiskLevel(riskLevel: string): RiskLevel {
    if (riskLevel === 'high' || riskLevel === 'medium') {
      return riskLevel;
    }

    return 'low';
  }

  private deriveRiskLevel(alarmCount: number, warningCount: number, totalReadings: number): RiskLevel {
    if (alarmCount > 0) {
      return 'high';
    }

    if (warningCount > 0 || totalReadings > 0) {
      return warningCount / Math.max(totalReadings, 1) >= 0.25 ? 'medium' : 'low';
    }

    return 'low';
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private handleError(error: HttpErrorResponse, message: string): Observable<never> {
    const detail = typeof error.error?.message === 'string' ? error.error.message : message;
    return throwError(() => new Error(detail));
  }
}
