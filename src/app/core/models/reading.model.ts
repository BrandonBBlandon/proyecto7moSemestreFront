export type EnvironmentStatus = 'normal' | 'warning' | 'alarm';
export type DeviceStatus = 'connected' | 'disconnected' | 'error';

export interface CurrentStatus {
  sensorValue: number;
  processedValue: number;
  status: EnvironmentStatus;
  deviceStatus: DeviceStatus;
  lastReadingAt: string | null;
}

export interface Reading {
  id: number;
  sensorValue: number;
  processedValue: number;
  status: EnvironmentStatus;
  createdAt: string;
}

export interface LatestReadingsResponse {
  items: Reading[];
}
