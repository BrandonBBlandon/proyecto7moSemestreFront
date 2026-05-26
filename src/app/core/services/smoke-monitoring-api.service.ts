import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError, timeout } from 'rxjs';

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
  totalIncidents?: number;
  averageValue?: number;
  avgSmokeValue?: number;
  maxValue?: number;
  maxSmokeValue?: number;
  minValue?: number;
  alarmTimeSeconds?: number;
  totalAlarmSeconds?: number;
  riskLevel?: string;
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
  deviceId?: number;
  sensorValue: number;
  processedValue?: number;
  status: string;
  createdAt: string;
}

interface CurrentStatusEnvelope {
  current?: LegacyReading | null;
  latestReading?: LegacyReading | null;
  sensorValue?: number | null;
  processedValue?: number | null;
  status?: string;
  deviceStatus?: string;
  lastReadingAt?: string | null;
  createdAt?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SmokeMonitoringApiService {
  private readonly apiUrlStorageKey = 'smoke_monitoring_api_url';
  private readonly legacyApiUrlStorageKey = 'https://proyecto7mosemestre.onrender.com';
  private readonly requestTimeoutMs = 20000;
  private readonly loggedApiUrls = new Set<string>();

  constructor(private readonly http: HttpClient) {}

  getApiUrl(): string {
    const storedUrl = localStorage.getItem(this.apiUrlStorageKey) || localStorage.getItem(this.legacyApiUrlStorageKey);
    return this.normalizeApiUrl(storedUrl || environment.apiUrl || '');
  }

  setApiUrl(value: string): void {
    const normalized = this.normalizeApiUrl(value);
    if (normalized) {
      localStorage.setItem(this.apiUrlStorageKey, normalized);
      localStorage.removeItem(this.legacyApiUrlStorageKey);
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.post<LoginResponse>('/api/auth/login', { username, password });
  }

  getCurrentStatus(): Observable<CurrentStatus> {
    return this.get<CurrentStatus | LegacyEnvelope<CurrentStatusEnvelope>>('/api/monitoring/current').pipe(
      map((status) => this.normalizeCurrentStatusResponse(status)),
      catchError(() => this.getCurrentStatusFromLegacyReadings())
    );
  }

  getLatestReadings(limit = 10): Observable<LatestReadingsResponse> {
    const params = new HttpParams().set('limit', limit);

    return this.get<LatestReadingsResponse | LegacyEnvelope<LegacyReading[]>>('/api/readings/latest', { params }).pipe(
      map((response) => this.normalizeLatestReadingsResponse(response)),
      catchError(() =>
        this.get<LegacyEnvelope<LegacyReading[]>>('/api/readings', { params }).pipe(
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

    return this.get<DailyReport | LegacyEnvelope<DailyReport>>('/api/reportes/daily', { params: finalParams }).pipe(
      map((report) => this.normalizeDailyReportResponse(report, date)),
      catchError(() =>
        this.get<DailyReport | LegacyEnvelope<DailyReport>>('/api/reports/daily', { params: finalParams }).pipe(
          map((report) => this.normalizeDailyReportResponse(report, date)),
          catchError(() =>
            this.get<LegacyEnvelope<DailyReport>>('/api/reports', { params: legacyParams }).pipe(
              map((response) => this.normalizeDailyReportResponse(response, date)),
              catchError((error) => this.handleError(error, 'No se pudo consultar el reporte diario.'))
            )
          )
        )
      )
    );
  }

  getRangeReport(from: string, to: string): Observable<RangeReport> {
    const finalParams = new HttpParams().set('from', from).set('to', to);
    const legacyParams = new HttpParams().set('type', 'range').set('from', from).set('to', to);

    return this.get<RangeReport | LegacyEnvelope<LegacyRangeReport>>('/api/reportes/range', { params: finalParams }).pipe(
      map((report) => this.normalizeRangeReportResponse(report, from, to)),
      catchError(() =>
        this.get<RangeReport | LegacyEnvelope<LegacyRangeReport>>('/api/reports/range', { params: finalParams }).pipe(
          map((report) => this.normalizeRangeReportResponse(report, from, to)),
          catchError(() =>
            this.get<LegacyEnvelope<LegacyRangeReport>>('/api/reports', { params: legacyParams }).pipe(
              map((response) => this.mapLegacyRangeReport(response.data, from, to)),
              catchError((error) => this.handleError(error, 'No se pudo consultar el reporte por rango.'))
            )
          )
        )
      )
    );
  }

  getMonthlyReport(year: number, month: number): Observable<MonthlyReport> {
    const monthText = String(month).padStart(2, '0');
    const monthParam = `${year}-${monthText}`;
    const finalParams = new HttpParams().set('month', monthParam);
    const legacyParams = new HttpParams().set('type', 'monthly').set('month', monthParam);

    return this.get<MonthlyReport | LegacyEnvelope<LegacyMonthlyReport>>('/api/reportes/monthly', { params: finalParams }).pipe(
      map((report) => this.normalizeMonthlyReportResponse(report, year, month)),
      catchError(() =>
        this.get<MonthlyReport | LegacyEnvelope<LegacyMonthlyReport>>('/api/reports/monthly', { params: finalParams }).pipe(
          map((report) => this.normalizeMonthlyReportResponse(report, year, month)),
          catchError(() =>
            this.get<LegacyEnvelope<LegacyMonthlyReport>>('/api/reports', { params: legacyParams }).pipe(
              map((response) => this.mapLegacyMonthlyReport(response.data, year, month)),
              catchError((error) => this.handleError(error, 'No se pudo consultar el reporte mensual.'))
            )
          )
        )
      )
    );
  }

  getIncidents(limit = 20): Observable<IncidentsResponse> {
    const params = new HttpParams().set('type', 'recent').set('limit', limit);

    return this.get<LegacyEnvelope<LegacyRecentReport>>('/api/reportes', { params }).pipe(
      map((response) => ({ items: this.mapLegacyIncidents(response.data?.readings || []) })),
      catchError(() =>
        this.get<LegacyEnvelope<LegacyRecentReport>>('/api/reports', { params }).pipe(
          map((response) => ({ items: this.mapLegacyIncidents(response.data?.readings || []) })),
          catchError((error) => this.handleError(error, 'No se pudo consultar el historial.'))
        )
      )
    );
  }

  checkHealth(): Observable<{ ok: boolean }> {
    return this.get<{ ok: boolean }>('/api/health').pipe(
      map((response) => ({ ok: response.ok === true })),
      catchError(() =>
        this.get<LegacyEnvelope<LegacyReading[]>>('/api/readings', {
          params: new HttpParams().set('limit', 1)
        }).pipe(
          map((response) => ({ ok: response.ok !== false })),
          catchError((error) => this.handleError(error, 'No hay comunicación con el backend.'))
        )
      )
    );
  }

  saveWifiConfig(ssid: string, password: string): Observable<{ success: boolean; message: string }> {
    return this.post<{ success: boolean; message: string }>('/api/device/wifi-config', { ssid, password }).pipe(
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
    return this.get<LegacyEnvelope<LegacyReading[]>>('/api/readings', {
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

  private get<T>(path: string, options?: { params?: HttpParams }): Observable<T> {
    const url = this.url(path);
    if (!url) {
      return this.missingApiUrlError();
    }

    return this.http.get<T>(url, options).pipe(timeout(this.requestTimeoutMs));
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    const url = this.url(path);
    if (!url) {
      return this.missingApiUrlError();
    }

    return this.http.post<T>(url, body).pipe(timeout(this.requestTimeoutMs));
  }

  private url(path: string): string | null {
    const apiUrl = this.getApiUrl();
    if (!this.loggedApiUrls.has(apiUrl)) {
      console.log('[API_URL]', apiUrl);
      this.loggedApiUrls.add(apiUrl);
    }

    if (!apiUrl) {
      return null;
    }

    return `${apiUrl}${path}`;
  }

  private missingApiUrlError<T>(): Observable<T> {
    const message = 'URL del backend no configurada. Define apiUrl en environment o guarda la URL en Ajustes.';
    console.error(message);
    return throwError(() => new Error(message));
  }

  private normalizeApiUrl(value: string): string {
    return value.trim().replace(/\/+$/, '');
  }

  private unwrapData<T>(response: unknown): T {
    if (this.isEnvelope(response)) {
      if (response.ok === false) {
        throw new Error(response.message || 'El backend respondio con error.');
      }

      if ('data' in response) {
        return response.data as T;
      }
    }

    return response as T;
  }

  private isEnvelope(response: unknown): response is LegacyEnvelope<unknown> {
    return !!response && typeof response === 'object' && ('ok' in response || 'data' in response);
  }

  private normalizeCurrentStatusResponse(response: CurrentStatus | LegacyEnvelope<CurrentStatusEnvelope>): CurrentStatus {
    const status = this.unwrapData<CurrentStatus | CurrentStatusEnvelope>(response);
    const source = (status || {}) as CurrentStatusEnvelope;
    const reading = source.current || source.latestReading || null;
    const lastReadingAt = source.lastReadingAt || source.createdAt || reading?.createdAt || null;
    const sensorValue = source.sensorValue ?? reading?.sensorValue ?? 0;
    const processedValue = source.processedValue ?? reading?.processedValue ?? sensorValue;

    return {
      sensorValue: this.toNumber(sensorValue),
      processedValue: this.toNumber(processedValue),
      status: this.normalizeStatus(source.status || reading?.status || 'normal'),
      deviceStatus: this.normalizeDeviceStatus(source.deviceStatus || (lastReadingAt ? this.inferDeviceStatus(lastReadingAt) : 'disconnected')),
      lastReadingAt
    };
  }

  private normalizeLatestReadingsResponse(response: LatestReadingsResponse | LegacyEnvelope<LegacyReading[]>): LatestReadingsResponse {
    const data = this.unwrapData<LatestReadingsResponse | LegacyReading[] | undefined>(response);
    const items: Array<Reading | LegacyReading> = Array.isArray(data) ? data : (data?.items || []);

    return {
      items: items.map((item) => this.normalizeReading(item))
    };
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

  private normalizeDailyReport(report: Partial<DailyReport> & Partial<LegacyReportSummary>, fallbackDate: string): DailyReport {
    return {
      date: report.date || fallbackDate,
      ...this.normalizeBaseReport(report)
    };
  }

  private normalizeDailyReportResponse(response: DailyReport | LegacyEnvelope<DailyReport>, fallbackDate: string): DailyReport {
    const report = this.unwrapData<DailyReport | undefined>(response);
    const normalized = this.normalizeDailyReport(this.getReportSummary(report), report?.date || fallbackDate);
    console.log('[Reports] respuesta normalizada:', normalized);
    return normalized;
  }

  private normalizeRangeReport(report: RangeReport): RangeReport {
    const summary = this.getReportSummary(report);

    return {
      from: report.from,
      to: report.to,
      ...this.normalizeBaseReport(summary),
      days: (report.days || []).map((day) => this.normalizeReportDay(day))
    };
  }

  private normalizeRangeReportResponse(response: RangeReport | LegacyEnvelope<LegacyRangeReport>, from: string, to: string): RangeReport {
    const report = this.unwrapData<RangeReport | LegacyRangeReport | undefined>(response);

    if (!report) {
      return { from, to, ...this.emptyBaseReport(), days: [] };
    }

    if ('summary' in report || 'byDay' in report) {
      return this.mapLegacyRangeReport(report as LegacyRangeReport, from, to);
    }

    return this.normalizeRangeReport(report);
  }

  private normalizeMonthlyReport(report: MonthlyReport): MonthlyReport {
    const summary = this.getReportSummary(report);

    return {
      year: this.toNumber(report.year),
      month: this.toNumber(report.month),
      ...this.normalizeBaseReport(summary),
      days: (report.days || []).map((day) => this.normalizeReportDay(day))
    };
  }

  private normalizeMonthlyReportResponse(response: MonthlyReport | LegacyEnvelope<LegacyMonthlyReport>, year: number, month: number): MonthlyReport {
    const report = this.unwrapData<MonthlyReport | LegacyMonthlyReport | undefined>(response);

    if (!report) {
      return { year, month, ...this.emptyBaseReport(), days: [] };
    }

    if ('summary' in report || 'byDay' in report) {
      return this.mapLegacyMonthlyReport(report as LegacyMonthlyReport, year, month);
    }

    return this.normalizeMonthlyReport(report);
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

  private normalizeBaseReport(report: Partial<BaseReport> & Partial<LegacyReportSummary>): BaseReport {
    const warningCount = this.toNumber(report.warningCount);
    const alarmCount = this.toNumber(report.alarmCount);
    const totalReadings = this.toNumber(report.totalReadings);

    return {
      totalReadings,
      totalIncidents: report.totalIncidents === undefined ? warningCount + alarmCount : this.toNumber(report.totalIncidents),
      averageValue: this.toNumber(report.averageValue ?? report.avgSmokeValue),
      maxValue: this.toNumber(report.maxValue ?? report.maxSmokeValue),
      alarmTimeSeconds: this.toNumber(report.alarmTimeSeconds ?? report.totalAlarmSeconds),
      riskLevel: report.riskLevel ? this.normalizeRiskLevel(report.riskLevel) : this.deriveRiskLevel(alarmCount, warningCount, totalReadings)
    };
  }

  private normalizeLegacySummary(summary?: LegacyReportSummary): BaseReport {
    const alarmCount = this.toNumber(summary?.alarmCount);
    const warningCount = this.toNumber(summary?.warningCount);
    const totalReadings = this.toNumber(summary?.totalReadings);

    return {
      totalReadings,
      totalIncidents: alarmCount + warningCount,
      averageValue: this.toNumber(summary?.averageValue ?? summary?.avgSmokeValue),
      maxValue: this.toNumber(summary?.maxValue ?? summary?.maxSmokeValue),
      alarmTimeSeconds: this.toNumber(summary?.alarmTimeSeconds ?? summary?.totalAlarmSeconds),
      riskLevel: summary?.riskLevel ? this.normalizeRiskLevel(summary.riskLevel) : this.deriveRiskLevel(alarmCount, warningCount, totalReadings)
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
      riskLevel: 'normal'
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
    const normalized = String(riskLevel || '').toLowerCase();

    if (normalized === 'high' || normalized === 'alarm' || normalized === 'alarma') {
      return 'alarm';
    }

    if (normalized === 'medium' || normalized === 'warning' || normalized === 'advertencia') {
      return 'warning';
    }

    return 'normal';
  }

  private deriveRiskLevel(alarmCount: number, warningCount: number, totalReadings: number): RiskLevel {
    if (alarmCount > 0) {
      return 'alarm';
    }

    if (warningCount > 0 || totalReadings > 0) {
      return warningCount / Math.max(totalReadings, 1) >= 0.25 ? 'warning' : 'normal';
    }

    return 'normal';
  }

  private getReportSummary<T extends object>(report: T | undefined): T & Partial<LegacyReportSummary> {
    const rawReport = (report || {}) as T & {
      summary?: Partial<LegacyReportSummary>;
      report?: Partial<LegacyReportSummary>;
      data?: Partial<LegacyReportSummary>;
    };
    return (rawReport.summary || rawReport.report || rawReport.data || rawReport) as T & Partial<LegacyReportSummary>;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private handleError(error: unknown, message: string): Observable<never> {
    console.error('[API Error]', error);

    if (error instanceof HttpErrorResponse) {
      const detail = typeof error.error?.message === 'string' ? error.error.message : message;
      return throwError(() => new Error(detail));
    }

    if (error instanceof Error && error.name === 'TimeoutError') {
      return throwError(() => new Error('El backend no respondio a tiempo. Intenta de nuevo.'));
    }

    const detail = error instanceof Error ? error.message : message;
    return throwError(() => new Error(detail));
  }
}
