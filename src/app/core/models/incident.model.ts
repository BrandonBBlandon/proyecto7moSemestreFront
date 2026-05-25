export type IncidentSeverity = 'warning' | 'alarm';
export type IncidentStatus = 'open' | 'closed';

export interface Incident {
  id: number;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  maxValue: number;
  severity: IncidentSeverity;
  status: IncidentStatus;
}

export interface IncidentsResponse {
  items: Incident[];
}
