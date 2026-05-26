export type RiskLevel = 'normal' | 'warning' | 'alarm';

export interface ReportDay {
  date: string;
  totalReadings: number;
  totalIncidents: number;
  maxValue: number;
}

export interface BaseReport {
  totalReadings: number;
  totalIncidents: number;
  averageValue: number;
  maxValue: number;
  alarmTimeSeconds: number;
  riskLevel: RiskLevel;
}

export interface DailyReport extends BaseReport {
  date: string;
}

export interface RangeReport extends BaseReport {
  from: string;
  to: string;
  days: ReportDay[];
}

export interface MonthlyReport extends BaseReport {
  year: number;
  month: number;
  days: ReportDay[];
}

export type ReportResult = DailyReport | RangeReport | MonthlyReport;
